"""Search API — semantic search with source citations."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.search import SearchRequest, SearchResponse
from app.services.search import SearchService
from app.api.deps import get_search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(
    req: SearchRequest,
    svc: SearchService = Depends(get_search_service),
) -> SearchResponse:
    return await svc.search(query=req.query, top_k=req.top_k)
