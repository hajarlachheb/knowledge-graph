"""Pydantic schemas for the search / RAG pipeline."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    title: str
    url: str | None = None
    snippet: str = ""
    node_type: str | None = None
    doc_id: str | None = None


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
    confidence: float = Field(ge=0.0, le=1.0, description="0 = no confidence, 1 = high")
    graph_context: list[dict] = Field(
        default_factory=list,
        description="Related graph nodes/edges surfaced during traversal",
    )
