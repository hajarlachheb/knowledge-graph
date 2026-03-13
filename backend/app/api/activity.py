"""Activity feed — recent platform events."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, union_all, literal, cast, String, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Comment, RexSheet, User, Vote
from app.models.schemas import ActivityItem
from app.api.deps import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityItem])
async def get_activity(
    department_id: int | None = None,
    limit: int = Query(30, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    items: list[ActivityItem] = []

    rex_q = select(RexSheet).options(
        selectinload(RexSheet.author)
    ).where(RexSheet.status == "published").order_by(RexSheet.created_at.desc()).limit(limit)
    if department_id:
        rex_q = rex_q.join(User, RexSheet.author_id == User.id).where(User.department_id == department_id)
    rexes = (await session.execute(rex_q)).scalars().unique().all()

    for r in rexes:
        items.append(ActivityItem(
            id=f"rex-{r.id}", type="new_rex",
            actor_name=r.author.full_name or r.author.username,
            actor_id=r.author_id,
            message=f"published a new REX sheet",
            rex_id=r.id, rex_title=r.title,
            created_at=r.created_at,
        ))

    comment_q = (
        select(Comment)
        .options(selectinload(Comment.author), selectinload(Comment.rex_sheet))
        .order_by(Comment.created_at.desc()).limit(limit)
    )
    comments = (await session.execute(comment_q)).scalars().all()
    for c in comments:
        items.append(ActivityItem(
            id=f"comment-{c.id}", type="comment",
            actor_name=c.author.full_name or c.author.username,
            actor_id=c.author_id,
            message=f"commented on a REX sheet",
            rex_id=c.rex_id,
            rex_title=c.rex_sheet.title if c.rex_sheet else None,
            created_at=c.created_at,
        ))

    vote_q = (
        select(Vote)
        .options(selectinload(Vote.user), selectinload(Vote.rex_sheet))
        .where(Vote.value == 1)
        .order_by(Vote.created_at.desc()).limit(limit)
    )
    votes = (await session.execute(vote_q)).scalars().all()
    for v in votes:
        items.append(ActivityItem(
            id=f"vote-{v.user_id}-{v.rex_id}", type="vote",
            actor_name=v.user.full_name or v.user.username,
            actor_id=v.user_id,
            message=f"upvoted a REX sheet",
            rex_id=v.rex_id,
            rex_title=v.rex_sheet.title if v.rex_sheet else None,
            created_at=v.created_at,
        ))

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[:limit]
