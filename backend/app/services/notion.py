"""Notion API integration — fetches pages/databases for ingestion."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from notion_client import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import DocumentMeta

logger = logging.getLogger(__name__)


class NotionService:
    def __init__(self) -> None:
        self.client = AsyncClient(auth=settings.notion_api_key)

    # ── Fetch helpers ──────────────────────────────────

    async def list_all_pages(self, root_page_id: str | None = None) -> list[dict[str, Any]]:
        """Recursively list child pages under *root_page_id* (or the workspace root)."""
        start_id = root_page_id or settings.notion_root_page_id
        pages: list[dict[str, Any]] = []
        await self._collect_children(start_id, pages)
        return pages

    async def _collect_children(self, block_id: str, acc: list[dict]) -> None:
        cursor: str | None = None
        while True:
            resp = await self.client.blocks.children.list(
                block_id=block_id, start_cursor=cursor, page_size=100
            )
            for block in resp["results"]:
                if block["type"] == "child_page":
                    page = await self.client.pages.retrieve(page_id=block["id"])
                    acc.append(page)
                    await self._collect_children(block["id"], acc)
            if not resp.get("has_more"):
                break
            cursor = resp["next_cursor"]

    async def get_page_content(self, page_id: str) -> str:
        """Return the plain-text content of a Notion page."""
        blocks = await self._get_all_blocks(page_id)
        return self._blocks_to_text(blocks)

    async def _get_all_blocks(self, block_id: str) -> list[dict]:
        all_blocks: list[dict] = []
        cursor: str | None = None
        while True:
            resp = await self.client.blocks.children.list(
                block_id=block_id, start_cursor=cursor, page_size=100
            )
            for block in resp["results"]:
                all_blocks.append(block)
                if block.get("has_children"):
                    children = await self._get_all_blocks(block["id"])
                    all_blocks.extend(children)
            if not resp.get("has_more"):
                break
            cursor = resp["next_cursor"]
        return all_blocks

    @staticmethod
    def _blocks_to_text(blocks: list[dict]) -> str:
        parts: list[str] = []
        for b in blocks:
            btype = b.get("type", "")
            data = b.get(btype, {})
            rich_texts = data.get("rich_text") or data.get("text") or []
            if isinstance(rich_texts, list):
                text = "".join(rt.get("plain_text", "") for rt in rich_texts)
                if text.strip():
                    parts.append(text)
        return "\n".join(parts)

    @staticmethod
    def extract_page_title(page: dict) -> str:
        props = page.get("properties", {})
        for prop in props.values():
            if prop.get("type") == "title":
                return "".join(
                    t.get("plain_text", "") for t in prop.get("title", [])
                )
        return "Untitled"

    @staticmethod
    def page_url(page: dict) -> str:
        return page.get("url", "")

    # ── Deduplication ──────────────────────────────────

    @staticmethod
    def content_hash(text: str) -> str:
        return hashlib.sha256(text.encode()).hexdigest()

    async def needs_update(self, session: AsyncSession, source_id: str, new_hash: str) -> bool:
        """Return True if the document is new or its content has changed."""
        result = await session.execute(
            select(DocumentMeta).where(DocumentMeta.source_id == source_id)
        )
        doc = result.scalar_one_or_none()
        if doc is None:
            return True
        return doc.content_hash != new_hash

    async def upsert_document_meta(
        self,
        session: AsyncSession,
        source_id: str,
        title: str,
        url: str,
        content_hash: str,
    ) -> None:
        result = await session.execute(
            select(DocumentMeta).where(DocumentMeta.source_id == source_id)
        )
        doc = result.scalar_one_or_none()
        if doc is None:
            doc = DocumentMeta(
                source="notion",
                source_id=source_id,
                title=title,
                url=url,
                content_hash=content_hash,
            )
            session.add(doc)
        else:
            doc.title = title
            doc.url = url
            doc.content_hash = content_hash
            doc.last_synced_at = datetime.now(timezone.utc)
        await session.commit()
