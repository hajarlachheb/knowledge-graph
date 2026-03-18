"""Reactions on REX sheets: helpful, applied, insightful, outdated."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Reaction, RexSheet, User
from app.models.schemas import ReactionIn, ReactionSummary, REACTION_TYPES
from app.api.deps import get_current_user

router = APIRouter(prefix="/learnings", tags=["reactions"])


@router.post("/{rex_id}/react")
async def add_reaction(
    rex_id: int,
    body: ReactionIn,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if body.type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {REACTION_TYPES}")

    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    result = await session.execute(
        select(Reaction).where(
            Reaction.user_id == current_user.id,
            Reaction.rex_id == rex_id,
            Reaction.type == body.type,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await session.delete(existing)
        await session.flush()

    reaction = Reaction(user_id=current_user.id, rex_id=rex_id, type=body.type)
    session.add(reaction)
    await session.commit()
    await session.refresh(reaction)
    return {"status": "ok", "id": reaction.id, "type": reaction.type}


@router.delete("/{rex_id}/react/{reaction_type}")
async def remove_reaction(
    rex_id: int,
    reaction_type: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Reaction).where(
            Reaction.user_id == current_user.id,
            Reaction.rex_id == rex_id,
            Reaction.type == reaction_type,
        )
    )
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Reaction not found")
    await session.delete(existing)
    await session.commit()
    return {"status": "removed"}


@router.get("/{rex_id}/reactions", response_model=ReactionSummary)
async def get_reaction_summary(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    counts_result = await session.execute(
        select(Reaction.type, func.count()).where(Reaction.rex_id == rex_id).group_by(Reaction.type)
    )
    counts: dict[str, int] = {rtype: 0 for rtype in REACTION_TYPES}
    for rtype, cnt in counts_result.all():
        counts[rtype] = cnt

    user_result = await session.execute(
        select(Reaction.type).where(
            Reaction.rex_id == rex_id,
            Reaction.user_id == current_user.id,
        )
    )
    user_reactions = [row[0] for row in user_result.all()]

    return ReactionSummary(
        helpful=counts["helpful"],
        applied=counts["applied"],
        insightful=counts["insightful"],
        outdated=counts["outdated"],
        user_reactions=user_reactions,
    )
