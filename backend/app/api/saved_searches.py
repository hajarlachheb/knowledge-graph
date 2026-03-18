"""Saved search filters with optional notification alerts."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import SavedSearch, User
from app.models.schemas import SavedSearchCreate, SavedSearchOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/saved-searches", tags=["saved-searches"])


@router.get("/", response_model=list[SavedSearchOut])
async def list_saved_searches(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=SavedSearchOut, status_code=201)
async def create_saved_search(
    body: SavedSearchCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    saved = SavedSearch(
        user_id=current_user.id,
        name=body.name,
        filters_json=body.filters_json,
        notify=body.notify,
    )
    session.add(saved)
    await session.commit()
    await session.refresh(saved)
    return saved


@router.delete("/{search_id}")
async def delete_saved_search(
    search_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    saved = await session.get(SavedSearch, search_id)
    if not saved:
        raise HTTPException(status_code=404, detail="Saved search not found")
    if saved.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await session.delete(saved)
    await session.commit()
    return {"status": "deleted"}
