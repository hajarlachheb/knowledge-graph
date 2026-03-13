"""Admin dashboard — platform analytics and user management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Comment, Department, RexSheet, RexView, User, Vote
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
