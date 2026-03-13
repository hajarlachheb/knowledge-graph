"""RAG search pipeline — semantic retrieval + graph traversal + LLM synthesis."""

from __future__ import annotations

import logging
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.models.search import SearchResponse, SourceCitation
from app.services.embeddings import embed_query
from app.services.graph_db import GraphDB
from app.services.vector_store import VectorStore

logger = logging.getLogger(__name__)

SEARCH_SYSTEM_PROMPT = """\
You are a helpful internal knowledge assistant. Answer the user's question
using ONLY the provided context (document excerpts and graph data).

Rules:
- Be concise and accurate.
- ALWAYS cite your sources using [Source: <title>] notation.
- If no context supports a confident answer, say "I don't have enough information to answer this."
- Never fabricate facts not present in the context.
- When listing people, projects, or decisions, use bullet points.

You will receive context in this format:
--- Document Chunks ---
(numbered excerpts from relevant documents)
--- Graph Context ---
(entity → relationship → entity triples from the knowledge graph)
"""


class SearchService:
    def __init__(self, graph_db: GraphDB, vector_store: VectorStore) -> None:
        self.graph_db = graph_db
        self.vector_store = vector_store
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.1,
        )

    async def search(self, query: str, top_k: int = 5) -> SearchResponse:
        query_vec = await embed_query(query)
        vector_hits = self.vector_store.search(query_vec, top_k=top_k)

        graph_results = await self._graph_traversal(query, vector_hits)

        context = self._build_context(vector_hits, graph_results)

        answer, confidence = await self._synthesize(query, context)

        sources = self._build_citations(vector_hits, graph_results)

        if not sources:
            answer = "I don't have enough information to answer this question."
            confidence = 0.0

        return SearchResponse(
            answer=answer,
            sources=sources,
            confidence=confidence,
            graph_context=graph_results,
        )

    async def _graph_traversal(
        self, query: str, vector_hits: list[dict]
    ) -> list[dict[str, Any]]:
        """Extract key terms from query and vector hits, then traverse the graph."""
        terms: set[str] = set()

        words = query.split()
        for i in range(len(words)):
            for j in range(i + 1, min(i + 4, len(words) + 1)):
                terms.add(" ".join(words[i:j]))

        all_results: list[dict] = []
        for term in sorted(terms, key=len, reverse=True)[:5]:
            results = await self.graph_db.traverse_from_entity(term, limit=10)
            if results:
                all_results.extend(results)
                break

        if not all_results:
            for term in sorted(terms, key=len, reverse=True)[:3]:
                nodes = await self.graph_db.search_nodes(term, limit=5)
                for node in nodes:
                    nid = node.get("id", "")
                    sub = await self.graph_db.get_subgraph(nid, depth=1)
                    for n in sub.get("nodes", []):
                        for e in sub.get("edges", []):
                            all_results.append({
                                "from": {"name": e.get("source", ""), "id": e.get("source")},
                                "relationship": e.get("type", ""),
                                "to": {"name": e.get("target", ""), "id": e.get("target")},
                            })
                if all_results:
                    break

        return all_results[:20]

    @staticmethod
    def _build_context(
        vector_hits: list[dict], graph_results: list[dict]
    ) -> str:
        parts = ["--- Document Chunks ---"]
        for i, hit in enumerate(vector_hits, 1):
            parts.append(
                f"[{i}] (Source: {hit.get('title', 'Unknown')} — {hit.get('url', 'N/A')})\n"
                f"{hit.get('text', '')}"
            )

        parts.append("\n--- Graph Context ---")
        for g in graph_results:
            from_name = g.get("from", {}).get("name", "?")
            rel = g.get("relationship", "?")
            to_name = g.get("to", {}).get("name", "?")
            parts.append(f"  {from_name} —[{rel}]→ {to_name}")

        return "\n\n".join(parts)

    async def _synthesize(self, query: str, context: str) -> tuple[str, float]:
        response = await self.llm.ainvoke(
            [
                SystemMessage(content=SEARCH_SYSTEM_PROMPT),
                HumanMessage(content=f"Context:\n{context}\n\nQuestion: {query}"),
            ]
        )
        answer = response.content.strip()

        has_sources = "[Source:" in answer or "[source:" in answer.lower()
        confidence = 0.8 if has_sources else 0.4

        return answer, confidence

    @staticmethod
    def _build_citations(
        vector_hits: list[dict], graph_results: list[dict]
    ) -> list[SourceCitation]:
        seen: set[str] = set()
        citations: list[SourceCitation] = []

        for hit in vector_hits:
            title = hit.get("title", "Unknown")
            if title in seen:
                continue
            seen.add(title)
            citations.append(
                SourceCitation(
                    title=title,
                    url=hit.get("url"),
                    snippet=hit.get("text", "")[:200],
                    node_type="Document",
                    doc_id=hit.get("doc_id"),
                )
            )

        for g in graph_results:
            for side in ("from", "to"):
                name = g.get(side, {}).get("name", "")
                if name and name not in seen:
                    seen.add(name)
                    labels = g.get(side, {}).get("labels", [])
                    citations.append(
                        SourceCitation(
                            title=name,
                            url=g.get(side, {}).get("source_url"),
                            node_type=labels[0] if labels else "Entity",
                        )
                    )

        return citations
