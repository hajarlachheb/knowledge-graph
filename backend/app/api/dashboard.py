"""Dashboard endpoint: personal stats and recommendations for the authenticated user."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Bookmark, RexSheet, RexTag, Tag, User, Comment
from app.api.deps import get_current_user
from app.api.learnings import _rex_to_out, _rex_query

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    my_rex_count = (await session.execute(
        select(func.count(RexSheet.id)).where(RexSheet.author_id == uid)
    )).scalar() or 0

    my_bookmark_count = (await session.execute(
        select(func.count(Bookmark.rex_id)).where(Bookmark.user_id == uid)
    )).scalar() or 0

    total_rex = (await session.execute(select(func.count(RexSheet.id)).where(RexSheet.status == "published"))).scalar() or 0
    total_users = (await session.execute(select(func.count(User.id)))).scalar() or 0

    dept_member_count = 0
    if current_user.department_id:
        dept_member_count = (await session.execute(
            select(func.count(User.id)).where(User.department_id == current_user.department_id)
        )).scalar() or 0

    # My recent REX sheets
    my_rex_result = await session.execute(
        _rex_query().where(RexSheet.author_id == uid).order_by(RexSheet.created_at.desc()).limit(5)
    )
    my_rex = [_rex_to_out(r, uid) for r in my_rex_result.scalars().unique().all()]

    # Department feed (other people in my department)
    dept_rex = []
    if current_user.department_id:
        dept_result = await session.execute(
            _rex_query()
            .join(User, RexSheet.author_id == User.id)
            .where(User.department_id == current_user.department_id, RexSheet.author_id != uid)
            .order_by(RexSheet.created_at.desc()).limit(5)
        )
        dept_rex = [_rex_to_out(r, uid) for r in dept_result.scalars().unique().all()]

    # Recommended: REX sheets with tags I've used, from outside my department
    my_tag_ids_result = await session.execute(
        select(RexTag.tag_id).join(RexSheet, RexTag.rex_id == RexSheet.id).where(RexSheet.author_id == uid)
    )
    my_tag_ids = {row[0] for row in my_tag_ids_result.all()}

    recommended = []
    if my_tag_ids:
        rec_result = await session.execute(
            _rex_query()
            .join(RexTag, RexSheet.id == RexTag.rex_id)
            .where(RexTag.tag_id.in_(my_tag_ids), RexSheet.author_id != uid)
            .order_by(RexSheet.created_at.desc()).limit(5)
        )
        recommended = [_rex_to_out(r, uid) for r in rec_result.scalars().unique().all()]

    # If no tag-based recs, show latest from other departments
    if not recommended:
        other_dept_filter = RexSheet.author_id != uid
        if current_user.department_id:
            other_dept_filter = (RexSheet.author_id != uid)
        rec_result = await session.execute(
            _rex_query().where(other_dept_filter).order_by(RexSheet.created_at.desc()).limit(5)
        )
        recommended = [_rex_to_out(r, uid) for r in rec_result.scalars().unique().all()]

    return {
        "stats": {
            "my_rex_count": my_rex_count,
            "my_bookmark_count": my_bookmark_count,
            "total_rex": total_rex,
            "total_users": total_users,
            "dept_member_count": dept_member_count,
        },
        "my_rex_sheets": my_rex,
        "department_feed": dept_rex,
        "recommended": recommended,
    }
