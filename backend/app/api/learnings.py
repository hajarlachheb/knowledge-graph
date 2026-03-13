"""REX Sheets router: CRUD + list with filtering, categories, drafts, views."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Bookmark, Comment, RexSheet, RexTag, RexView, Tag, User, Vote
from app.models.schemas import (
    DepartmentOut,
    RexCreate,
    RexListOut,
    RexOut,
    RexUpdate,
    SkillOut,
    TagOut,
    UserOut,
)
from app.api.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/learnings", tags=["rex-sheets"])


def _user_out(user: User) -> UserOut:
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


def _rex_to_out(rex: RexSheet, current_user_id: int | None = None) -> RexOut:
    bookmark_count = len(rex.bookmarked_by) if rex.bookmarked_by else 0
    is_bookmarked = False
    if current_user_id and rex.bookmarked_by:
        is_bookmarked = any(b.user_id == current_user_id for b in rex.bookmarked_by)

    vote_score = sum(v.value for v in (rex.votes_rel or []))
    user_vote = 0
    if current_user_id and rex.votes_rel:
        for v in rex.votes_rel:
            if v.user_id == current_user_id:
                user_vote = v.value
                break

    view_count = len(rex.views_rel) if rex.views_rel else 0
    comment_count = len(rex.comments_rel) if rex.comments_rel else 0

    return RexOut(
        id=rex.id, title=rex.title,
        problematic=rex.problematic, solution=rex.solution,
        category=rex.category or "lesson-learned",
        status=rex.status or "published",
        created_at=rex.created_at, updated_at=rex.updated_at,
        author=_user_out(rex.author),
        tags=[TagOut(id=t.id, name=t.name) for t in (rex.tags or [])],
        bookmark_count=bookmark_count, is_bookmarked=is_bookmarked,
        vote_score=vote_score, user_vote=user_vote,
        view_count=view_count, comment_count=comment_count,
    )


def _rex_query():
    return select(RexSheet).options(
        selectinload(RexSheet.author).selectinload(User.department),
        selectinload(RexSheet.author).selectinload(User.skills),
        selectinload(RexSheet.tags),
        selectinload(RexSheet.bookmarked_by),
        selectinload(RexSheet.votes_rel),
        selectinload(RexSheet.views_rel),
        selectinload(RexSheet.comments_rel),
    )


@router.get("", response_model=RexListOut)
async def list_rex(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tag: str | None = None,
    author_id: int | None = None,
    department_id: int | None = None,
    category: str | None = None,
    q: str | None = None,
    sort: str = Query("newest", regex="^(newest|oldest|most_voted|most_viewed)$"),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    query = _rex_query().where(RexSheet.status == "published")
    count_query = select(func.count(RexSheet.id)).where(RexSheet.status == "published")

    if tag:
        query = query.join(RexSheet.tags).where(Tag.name == tag)
        count_query = count_query.join(RexSheet.tags).where(Tag.name == tag)
    if author_id:
        query = query.where(RexSheet.author_id == author_id)
        count_query = count_query.where(RexSheet.author_id == author_id)
    if department_id:
        query = query.join(RexSheet.author).where(User.department_id == department_id)
        count_query = count_query.join(User, RexSheet.author_id == User.id).where(User.department_id == department_id)
    if category:
        query = query.where(RexSheet.category == category)
        count_query = count_query.where(RexSheet.category == category)
    if q:
        pattern = f"%{q}%"
        query = query.where(RexSheet.title.ilike(pattern) | RexSheet.problematic.ilike(pattern))
        count_query = count_query.where(RexSheet.title.ilike(pattern) | RexSheet.problematic.ilike(pattern))

    total = (await session.execute(count_query)).scalar() or 0

    if sort == "oldest":
        query = query.order_by(RexSheet.created_at.asc())
    elif sort == "most_voted":
        query = query.order_by(RexSheet.created_at.desc())
    elif sort == "most_viewed":
        query = query.order_by(RexSheet.created_at.desc())
    else:
        query = query.order_by(RexSheet.created_at.desc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(query)
    sheets = list(result.scalars().unique().all())

    uid = current_user.id if current_user else None

    if sort == "most_voted":
        sheets.sort(key=lambda r: sum(v.value for v in (r.votes_rel or [])), reverse=True)
    elif sort == "most_viewed":
        sheets.sort(key=lambda r: len(r.views_rel or []), reverse=True)

    return RexListOut(items=[_rex_to_out(r, uid) for r in sheets], total=total, page=page, page_size=page_size)


@router.get("/my-drafts", response_model=list[RexOut])
async def my_drafts(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        _rex_query().where(RexSheet.author_id == current_user.id, RexSheet.status == "draft")
        .order_by(RexSheet.updated_at.desc())
    )
    return [_rex_to_out(r, current_user.id) for r in result.scalars().unique().all()]


@router.post("", response_model=RexOut, status_code=status.HTTP_201_CREATED)
async def create_rex(
    body: RexCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = RexSheet(
        author_id=current_user.id, title=body.title,
        problematic=body.problematic, solution=body.solution,
        category=body.category, status=body.status,
    )
    session.add(rex)
    await session.flush()

    for tag_name in body.tags:
        tag_name = tag_name.strip().lower()
        if not tag_name:
            continue
        result = await session.execute(select(Tag).where(Tag.name == tag_name))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=tag_name)
            session.add(tag)
            await session.flush()
        session.add(RexTag(rex_id=rex.id, tag_id=tag.id))

    await session.commit()
    result = await session.execute(_rex_query().where(RexSheet.id == rex.id))
    rex = result.scalar_one()
    return _rex_to_out(rex, current_user.id)


@router.get("/{rex_id}", response_model=RexOut)
async def get_rex(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    result = await session.execute(_rex_query().where(RexSheet.id == rex_id))
    rex = result.scalar_one_or_none()
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    if rex.status == "draft" and (not current_user or current_user.id != rex.author_id):
        raise HTTPException(status_code=404, detail="REX sheet not found")

    if current_user:
        today = datetime.utcnow().date()
        existing_view = await session.execute(
            select(RexView).where(
                RexView.rex_id == rex_id,
                RexView.user_id == current_user.id,
                func.date(RexView.viewed_at) == today,
            )
        )
        if not existing_view.scalar_one_or_none():
            session.add(RexView(rex_id=rex_id, user_id=current_user.id))
            await session.commit()
            result = await session.execute(_rex_query().where(RexSheet.id == rex_id))
            rex = result.scalar_one()

    uid = current_user.id if current_user else None
    return _rex_to_out(rex, uid)


@router.put("/{rex_id}", response_model=RexOut)
async def update_rex(
    rex_id: int,
    body: RexUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(_rex_query().where(RexSheet.id == rex_id))
    rex = result.scalar_one_or_none()
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    if rex.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your REX sheet")

    if body.title is not None:
        rex.title = body.title
    if body.problematic is not None:
        rex.problematic = body.problematic
    if body.solution is not None:
        rex.solution = body.solution
    if body.category is not None:
        rex.category = body.category
    if body.status is not None:
        rex.status = body.status

    if body.tags is not None:
        await session.execute(delete(RexTag).where(RexTag.rex_id == rex.id))
        for tag_name in body.tags:
            tag_name = tag_name.strip().lower()
            if not tag_name:
                continue
            res = await session.execute(select(Tag).where(Tag.name == tag_name))
            tag = res.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
                await session.flush()
            session.add(RexTag(rex_id=rex.id, tag_id=tag.id))

    await session.commit()
    result = await session.execute(_rex_query().where(RexSheet.id == rex.id))
    rex = result.scalar_one()
    return _rex_to_out(rex, current_user.id)


@router.delete("/{rex_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rex(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(select(RexSheet).where(RexSheet.id == rex_id))
    rex = result.scalar_one_or_none()
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")
    if rex.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your REX sheet")
    await session.delete(rex)
    await session.commit()
