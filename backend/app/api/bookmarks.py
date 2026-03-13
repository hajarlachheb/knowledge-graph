"""Bookmarks router: save/unsave REX sheets."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Bookmark, RexSheet, User
from app.models.schemas import RexOut
from app.api.deps import get_current_user
from app.api.learnings import _rex_to_out, _rex_query

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[RexOut])
async def list_bookmarks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        _rex_query()
        .join(Bookmark, Bookmark.rex_id == RexSheet.id)
        .where(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
    )
    sheets = result.scalars().unique().all()
    return [_rex_to_out(r, current_user.id) for r in sheets]


@router.post("/{rex_id}", status_code=status.HTTP_201_CREATED)
async def add_bookmark(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    existing = await session.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.rex_id == rex_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already bookmarked")

    session.add(Bookmark(user_id=current_user.id, rex_id=rex_id))
    await session.commit()
    return {"detail": "Bookmarked"}


@router.delete("/{rex_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bookmark(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.rex_id == rex_id)
    )
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await session.delete(bookmark)
    await session.commit()
