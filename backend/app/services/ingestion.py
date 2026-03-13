"""End-to-end ingestion pipeline: Notion → extraction → graph + vectors."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import IngestionJob
from app.services.notion import NotionService
from app.services.extraction import ExtractionService
from app.services.entity_resolution import resolve_entities, remap_relationships
from app.services.graph_db import GraphDB
from app.services.vector_store import VectorStore
from app.services.embeddings import chunk_text, embed_texts

logger = logging.getLogger(__name__)


class IngestionPipeline:
    def __init__(
        self,
        notion: NotionService,
        extraction: ExtractionService,
        graph_db: GraphDB,
        vector_store: VectorStore,
    ) -> None:
        self.notion = notion
        self.extraction = extraction
        self.graph_db = graph_db
        self.vector_store = vector_store

    async def run_full_sync(self, session: AsyncSession) -> dict:
        """Sync all Notion pages: fetch → extract → store graph + vectors."""
        job = IngestionJob(
            source="notion",
            source_id="full_sync",
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        session.add(job)
        await session.commit()

        stats = {"pages_fetched": 0, "pages_updated": 0, "nodes": 0, "rels": 0, "errors": []}

        try:
            pages = await self.notion.list_all_pages()
            stats["pages_fetched"] = len(pages)

            for page in pages:
                page_id = page["id"]
                title = self.notion.extract_page_title(page)
                url = self.notion.page_url(page)

                try:
                    text = await self.notion.get_page_content(page_id)
                    content_hash = self.notion.content_hash(text)

                    if not await self.notion.needs_update(session, page_id, content_hash):
                        continue

                    result = await self.extraction.extract(
                        doc_id=page_id, title=title, text=text, source_url=url
                    )

                    resolved_nodes = resolve_entities(result.nodes)
                    id_remap = {n.id: n.id for n in resolved_nodes}
                    for orig in result.nodes:
                        for res in resolved_nodes:
                            if orig.node_type == res.node_type and orig.name == res.name:
                                id_remap[orig.id] = res.id
                                break

                    resolved_rels = remap_relationships(result.relationships, id_remap)

                    await self.graph_db.write_extraction(resolved_nodes, resolved_rels)
                    stats["nodes"] += len(resolved_nodes)
                    stats["rels"] += len(resolved_rels)

                    chunks = chunk_text(text)
                    embeddings = await embed_texts(chunks)
                    self.vector_store.upsert_chunks(
                        doc_id=page_id, title=title, url=url,
                        chunks=chunks, embeddings=embeddings,
                    )

                    await self.notion.upsert_document_meta(
                        session, page_id, title, url, content_hash
                    )
                    stats["pages_updated"] += 1

                except Exception as exc:
                    logger.exception("Error processing page %s", page_id)
                    stats["errors"].append({"page_id": page_id, "error": str(exc)})

            job.status = "completed"
        except Exception as exc:
            logger.exception("Ingestion failed")
            job.status = "failed"
            job.error = str(exc)
        finally:
            job.finished_at = datetime.now(timezone.utc)
            await session.commit()

        return stats

    async def ingest_single_page(self, session: AsyncSession, page_id: str) -> dict:
        """Ingest (or re-ingest) a single Notion page by ID."""
        page = await self.notion.client.pages.retrieve(page_id=page_id)
        title = self.notion.extract_page_title(page)
        url = self.notion.page_url(page)
        text = await self.notion.get_page_content(page_id)

        result = await self.extraction.extract(
            doc_id=page_id, title=title, text=text, source_url=url
        )

        resolved_nodes = resolve_entities(result.nodes)
        id_remap = {n.id: n.id for n in resolved_nodes}
        for orig in result.nodes:
            for res in resolved_nodes:
                if orig.node_type == res.node_type and orig.name == res.name:
                    id_remap[orig.id] = res.id
                    break
        resolved_rels = remap_relationships(result.relationships, id_remap)

        await self.graph_db.write_extraction(resolved_nodes, resolved_rels)

        chunks = chunk_text(text)
        embeddings = await embed_texts(chunks)
        self.vector_store.upsert_chunks(
            doc_id=page_id, title=title, url=url,
            chunks=chunks, embeddings=embeddings,
        )

        content_hash = self.notion.content_hash(text)
        await self.notion.upsert_document_meta(session, page_id, title, url, content_hash)

        return {
            "page_id": page_id,
            "title": title,
            "nodes": len(resolved_nodes),
            "relationships": len(resolved_rels),
            "chunks": len(chunks),
        }
