"""Leaderboard: top contributors ranked by total votes received on their REX sheets."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import RexSheet, RexTag, Tag, User, Vote
from app.models.schemas import ContributorOut, DepartmentOut

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

TRUSTED_THRESHOLD = 10


@router.get("", response_model=list[ContributorOut])
async def get_leaderboard(session: AsyncSession = Depends(get_session)):
    users_result = await session.execute(
        select(User).options(
            selectinload(User.department),
            selectinload(User.rex_sheets).selectinload(RexSheet.votes_rel),
            selectinload(User.rex_sheets).selectinload(RexSheet.tags),
        )
    )
    users = users_result.scalars().unique().all()

    ranked = []
    for u in users:
        sheets = u.rex_sheets or []
        rex_count = len(sheets)
        if rex_count == 0:
            continue

        total_votes = sum(
            sum(v.value for v in (rex.votes_rel or []))
            for rex in sheets
        )
        contributor_score = total_votes + rex_count * 2

        tag_freq: dict[str, int] = {}
        for rex in sheets:
            for t in (rex.tags or []):
                tag_freq[t.name] = tag_freq.get(t.name, 0) + 1
        top_tags = sorted(tag_freq, key=lambda x: tag_freq[x], reverse=True)[:5]

        dept = None
        if u.department:
            dept = DepartmentOut(id=u.department.id, name=u.department.name, description=u.department.description)

        ranked.append(ContributorOut(
            id=u.id,
            full_name=u.full_name or u.username,
            position=u.position,
            department=dept,
            rex_count=rex_count,
            total_votes=total_votes,
            contributor_score=contributor_score,
            is_trusted=contributor_score >= TRUSTED_THRESHOLD,
            top_tags=top_tags,
        ))

    ranked.sort(key=lambda x: x.contributor_score, reverse=True)
    return ranked
