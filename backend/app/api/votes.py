"""Voting on REX sheets: upvote (+1) or downvote (-1), with notifications."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Notification, RexSheet, User, Vote
from app.models.schemas import VoteIn
from app.api.deps import get_current_user

router = APIRouter(prefix="/votes", tags=["votes"])


@router.post("/{rex_id}")
async def cast_vote(
    rex_id: int,
    body: VoteIn,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    if rex.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own REX sheet")

    result = await session.execute(
        select(Vote).where(Vote.user_id == current_user.id, Vote.rex_id == rex_id)
    )
    existing = result.scalar_one_or_none()

    if body.value == 0:
        if existing:
            await session.delete(existing)
        await session.commit()
        return {"status": "removed"}

    is_new_vote = existing is None
    if existing:
        existing.value = body.value
    else:
        session.add(Vote(user_id=current_user.id, rex_id=rex_id, value=body.value))

    if is_new_vote and body.value == 1 and rex.author_id != current_user.id:
        session.add(Notification(
            user_id=rex.author_id, type="vote", rex_id=rex_id,
            actor_id=current_user.id,
            message=f"{current_user.full_name or current_user.username} upvoted your REX sheet",
        ))

    await session.commit()
    return {"status": "ok", "value": body.value}


@router.delete("/{rex_id}")
async def remove_vote(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Vote).where(Vote.user_id == current_user.id, Vote.rex_id == rex_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await session.delete(existing)
        await session.commit()
    return {"status": "removed"}
