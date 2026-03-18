"""Moderation: admin-only endpoints to review flagged REX sheets."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import RexSheet, User
from app.models.schemas import ModerationItem
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["moderation"])


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.get("/moderation", response_model=list[ModerationItem])
async def list_flagged(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await session.execute(
        select(RexSheet).where(RexSheet.flagged == True).order_by(RexSheet.created_at.desc())  # noqa: E712
    )
    sheets = result.scalars().all()
    return [
        ModerationItem(
            rex_id=r.id,
            title=r.title,
            author_name=r.author.full_name or r.author.username,
            flagged_reason=r.flagged_reason,
            created_at=r.created_at,
        )
        for r in sheets
    ]


@router.post("/moderation/{rex_id}/approve")
async def approve_rex(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    rex.flagged = False
    rex.approved = True
    await session.commit()
    return {"detail": "Approved"}


@router.post("/moderation/{rex_id}/reject")
async def reject_rex(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    rex.approved = False
    await session.commit()
    return {"detail": "Rejected"}
