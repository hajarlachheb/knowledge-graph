"""Badges and gamification: list, check, and award badges."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Badge, UserBadge, RexSheet, Vote, User
from app.models.schemas import BadgeOut, UserBadgeOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("/", response_model=list[BadgeOut])
async def list_badges(
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Badge))
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=list[UserBadgeOut])
async def get_user_badges(
    user_id: int,
    session: AsyncSession = Depends(get_session),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    rows = result.scalars().all()

    out: list[UserBadgeOut] = []
    for ub in rows:
        badge = await session.get(Badge, ub.badge_id)
        if badge:
            out.append(UserBadgeOut(
                badge=BadgeOut.model_validate(badge),
                awarded_at=ub.awarded_at,
            ))
    return out


BADGE_RULES: list[tuple[str, str, int]] = [
    ("First REX", "rex_count", 1),
    ("10 REX", "rex_count", 10),
    ("50 REX", "rex_count", 50),
    ("Top Contributor", "vote_count", 50),
]


@router.post("/check", response_model=list[BadgeOut])
async def check_badges(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex_count_result = await session.execute(
        select(func.count()).select_from(RexSheet).where(RexSheet.author_id == current_user.id)
    )
    rex_count: int = rex_count_result.scalar() or 0

    vote_count_result = await session.execute(
        select(func.count()).select_from(Vote)
        .join(RexSheet, Vote.rex_id == RexSheet.id)
        .where(RexSheet.author_id == current_user.id)
    )
    total_votes: int = vote_count_result.scalar() or 0

    counts = {"rex_count": rex_count, "vote_count": total_votes}
    newly_awarded: list[Badge] = []

    for badge_name, criteria_type, threshold in BADGE_RULES:
        if counts.get(criteria_type, 0) < threshold:
            continue

        badge_result = await session.execute(
            select(Badge).where(Badge.name == badge_name)
        )
        badge = badge_result.scalar_one_or_none()
        if not badge:
            continue

        already = await session.execute(
            select(UserBadge).where(
                UserBadge.user_id == current_user.id,
                UserBadge.badge_id == badge.id,
            )
        )
        if already.scalar_one_or_none():
            continue

        session.add(UserBadge(user_id=current_user.id, badge_id=badge.id))
        newly_awarded.append(badge)

    if newly_awarded:
        await session.commit()
    return newly_awarded
