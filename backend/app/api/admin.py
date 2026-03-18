"""Admin dashboard — platform analytics and user management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta

from app.db.postgres import get_session
from app.db.models import AuditLog, Comment, Department, RexSheet, RexView, SearchLog, User, Vote
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def platform_stats(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    total_users = (await session.execute(select(func.count(User.id)))).scalar() or 0
    total_rex = (await session.execute(select(func.count(RexSheet.id)).where(RexSheet.status == "published"))).scalar() or 0
    total_comments = (await session.execute(select(func.count(Comment.id)))).scalar() or 0
    total_votes = (await session.execute(select(func.count(Vote.user_id)))).scalar() or 0
    total_views = (await session.execute(select(func.count(RexView.id)))).scalar() or 0
    total_departments = (await session.execute(select(func.count(Department.id)))).scalar() or 0

    dept_stats = (await session.execute(
        select(Department.name, func.count(User.id))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.name)
    )).all()

    return {
        "total_users": total_users,
        "total_rex": total_rex,
        "total_comments": total_comments,
        "total_votes": total_votes,
        "total_views": total_views,
        "total_departments": total_departments,
        "departments": [{"name": name, "member_count": count} for name, count in dept_stats],
    }


@router.get("/users")
async def list_all_users(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id, "username": u.username, "email": u.email,
            "full_name": u.full_name, "position": u.position,
            "is_admin": u.is_admin, "created_at": u.created_at.isoformat(),
            "department": u.department.name if u.department else None,
        }
        for u in users
    ]


@router.post("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    await session.commit()
    return {"id": user.id, "is_admin": user.is_admin}


@router.get("/analytics")
async def admin_analytics(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    cutoff_30d = datetime.utcnow() - timedelta(days=30)

    views_30d = (await session.execute(
        select(func.count(RexView.id)).where(RexView.viewed_at >= cutoff_30d)
    )).scalar() or 0

    rex_30d = (await session.execute(
        select(func.count(RexSheet.id)).where(RexSheet.created_at >= cutoff_30d)
    )).scalar() or 0

    comments_30d = (await session.execute(
        select(func.count(Comment.id)).where(Comment.created_at >= cutoff_30d)
    )).scalar() or 0

    top_queries_result = await session.execute(
        select(SearchLog.query, func.count(SearchLog.id).label("cnt"))
        .where(SearchLog.created_at >= cutoff_30d)
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(20)
    )
    top_queries = [{"query": q, "count": c} for q, c in top_queries_result.all()]

    return {
        "views_30d": views_30d,
        "rex_30d": rex_30d,
        "comments_30d": comments_30d,
        "top_queries": top_queries,
    }


@router.get("/content-health")
async def content_health(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    cutoff = datetime.utcnow() - timedelta(days=90)
    from sqlalchemy.orm import selectinload
    result = await session.execute(
        select(RexSheet)
        .options(selectinload(RexSheet.author), selectinload(RexSheet.views_rel), selectinload(RexSheet.votes_rel), selectinload(RexSheet.comments_rel))
        .where(RexSheet.status == "published", RexSheet.updated_at < cutoff)
        .order_by(RexSheet.updated_at.asc())
        .limit(50)
    )
    stale = []
    for rex in result.scalars().unique().all():
        days = (datetime.utcnow() - rex.updated_at).days
        stale.append({
            "rex_id": rex.id,
            "title": rex.title,
            "author_name": rex.author.full_name or rex.author.username,
            "days_since_update": days,
            "view_count": len(rex.views_rel or []),
            "vote_score": sum(v.value for v in (rex.votes_rel or [])),
            "comment_count": len(rex.comments_rel or []),
            "status": "stale",
        })
    return stale


@router.get("/audit-log")
async def get_audit_log(
    page: int = 1,
    action: str | None = None,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.where(AuditLog.action == action)
    query = query.offset((page - 1) * 50).limit(50)
    result = await session.execute(query)
    logs = result.scalars().all()
    out = []
    for log in logs:
        user = await session.get(User, log.user_id) if log.user_id else None
        out.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": (user.full_name or user.username) if user else "",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details_json": log.details_json,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        })
    return out
