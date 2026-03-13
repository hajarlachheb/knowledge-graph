"""Users router: profiles, profile editing, skills management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Follow, RexSheet, RexView, Skill, User, UserSkill, Vote
from app.models.schemas import DepartmentOut, RexListOut, SkillOut, SkillsUpdate, UserOut, UserProfile, UserUpdate
from app.api.deps import get_current_user, get_optional_user
from app.api.learnings import _rex_to_out, _rex_query

router = APIRouter(prefix="/users", tags=["users"])


def _full_user_out(user: User) -> UserOut:
    dept = None
    if user.department:
        dept = DepartmentOut(id=user.department.id, name=user.department.name, description=user.department.description)
    skills = [SkillOut(id=s.id, name=s.name) for s in (user.skills or [])]
    return UserOut(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, position=user.position,
        department=dept, skills=skills,
        bio=user.bio, avatar_url=user.avatar_url, is_admin=user.is_admin, created_at=user.created_at,
    )


@router.get("", response_model=list[UserOut])
async def list_users(
    department_id: int | None = None,
    session: AsyncSession = Depends(get_session),
):
    query = select(User).options(selectinload(User.department), selectinload(User.skills))
    if department_id:
        query = query.where(User.department_id == department_id)
    query = query.order_by(User.full_name)
    result = await session.execute(query)
    users = result.scalars().unique().all()
    return [_full_user_out(u) for u in users]


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    result = await session.execute(
        select(User).options(selectinload(User.department), selectinload(User.skills)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rex_count = (await session.execute(
        select(func.count(RexSheet.id)).where(RexSheet.author_id == user_id)
    )).scalar() or 0

    total_votes = (await session.execute(
        select(func.coalesce(func.sum(Vote.value), 0))
        .join(RexSheet, Vote.rex_id == RexSheet.id)
        .where(RexSheet.author_id == user_id)
    )).scalar() or 0

    contributor_score = total_votes + rex_count * 2

    follower_count = (await session.execute(
        select(func.count(Follow.follower_id)).where(Follow.followed_id == user_id)
    )).scalar() or 0

    following_count = (await session.execute(
        select(func.count(Follow.followed_id)).where(Follow.follower_id == user_id)
    )).scalar() or 0

    is_followed = False
    if current_user:
        f = await session.execute(
            select(Follow).where(Follow.follower_id == current_user.id, Follow.followed_id == user_id)
        )
        is_followed = f.scalar_one_or_none() is not None

    total_views = (await session.execute(
        select(func.count(RexView.id))
        .join(RexSheet, RexView.rex_id == RexSheet.id)
        .where(RexSheet.author_id == user_id)
    )).scalar() or 0

    out = _full_user_out(user)
    return UserProfile(
        **out.model_dump(), rex_count=rex_count,
        contributor_score=contributor_score, is_trusted=contributor_score >= 10,
        follower_count=follower_count, following_count=following_count,
        is_followed=is_followed, total_views=total_views,
    )


@router.put("/me", response_model=UserOut)
async def update_profile(
    body: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.position is not None:
        current_user.position = body.position
    if body.bio is not None:
        current_user.bio = body.bio
    if body.department_id is not None:
        current_user.department_id = body.department_id

    await session.commit()
    await session.refresh(current_user)
    return _full_user_out(current_user)


@router.put("/me/skills", response_model=UserOut)
async def update_skills(
    body: SkillsUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await session.execute(delete(UserSkill).where(UserSkill.user_id == current_user.id))

    for skill_name in body.skills:
        skill_name = skill_name.strip()
        if not skill_name:
            continue
        result = await session.execute(select(Skill).where(Skill.name == skill_name))
        skill = result.scalar_one_or_none()
        if not skill:
            skill = Skill(name=skill_name)
            session.add(skill)
            await session.flush()
        session.add(UserSkill(user_id=current_user.id, skill_id=skill.id))

    await session.commit()
    await session.refresh(current_user)
    return _full_user_out(current_user)


@router.get("/{user_id}/learnings", response_model=RexListOut)
async def get_user_rex_sheets(
    user_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total = (await session.execute(
        select(func.count(RexSheet.id)).where(RexSheet.author_id == user_id)
    )).scalar() or 0

    result = await session.execute(
        _rex_query().where(RexSheet.author_id == user_id)
        .order_by(RexSheet.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    sheets = result.scalars().unique().all()

    uid = current_user.id if current_user else None
    return RexListOut(items=[_rex_to_out(r, uid) for r in sheets], total=total, page=page, page_size=page_size)
