"""Ingestion API — trigger Notion sync and check status."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.services.ingestion import IngestionPipeline
from app.api.deps import get_ingestion_pipeline

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.post("/sync")
async def trigger_full_sync(
    background_tasks: BackgroundTasks,
    pipeline: IngestionPipeline = Depends(get_ingestion_pipeline),
    session: AsyncSession = Depends(get_session),
):
    """Trigger a full Notion sync in the background."""

    async def _run():
        async with get_session().__anext__() as s:  # type: ignore[union-attr]
            return await pipeline.run_full_sync(s)

    background_tasks.add_task(pipeline.run_full_sync, session)
    return {"status": "sync_started"}


@router.post("/page/{page_id}")
async def ingest_single_page(
    page_id: str,
    pipeline: IngestionPipeline = Depends(get_ingestion_pipeline),
    session: AsyncSession = Depends(get_session),
):
    """Ingest a single Notion page by ID."""
    result = await pipeline.ingest_single_page(session, page_id)
    return result
