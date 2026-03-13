"""FastAPI dependency injection wiring for services."""

from __future__ import annotations

from app.services.graph_db import GraphDB
from app.services.vector_store import VectorStore
from app.services.notion import NotionService
from app.services.extraction import ExtractionService
from app.services.search import SearchService
from app.services.ingestion import IngestionPipeline

_graph_db: GraphDB | None = None
_vector_store: VectorStore | None = None
_search_service: SearchService | None = None
_ingestion_pipeline: IngestionPipeline | None = None


async def init_services() -> None:
    global _graph_db, _vector_store, _search_service, _ingestion_pipeline

    _graph_db = GraphDB()
    await _graph_db.connect()

    _vector_store = VectorStore()
    await _vector_store.connect()

    _search_service = SearchService(graph_db=_graph_db, vector_store=_vector_store)

    _ingestion_pipeline = IngestionPipeline(
        notion=NotionService(),
        extraction=ExtractionService(),
        graph_db=_graph_db,
        vector_store=_vector_store,
    )


async def shutdown_services() -> None:
    if _graph_db:
        await _graph_db.close()
    if _vector_store:
        _vector_store.close()


def get_graph_db() -> GraphDB:
    assert _graph_db is not None
    return _graph_db


def get_vector_store() -> VectorStore:
    assert _vector_store is not None
    return _vector_store


def get_search_service() -> SearchService:
    assert _search_service is not None
    return _search_service


def get_ingestion_pipeline() -> IngestionPipeline:
    assert _ingestion_pipeline is not None
    return _ingestion_pipeline
