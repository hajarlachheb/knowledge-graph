"""Comments on REX sheets — threaded discussion."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Comment, Notification, RexSheet, User
from app.models.schemas import CommentCreate, CommentOut, DepartmentOut, SkillOut, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/learnings", tags=["comments"])


def _user_out(u: User) -> UserOut:
    dept = None
    if u.department:
        dept = DepartmentOut(id=u.department.id, name=u.department.name, description=u.department.description)
    skills = [SkillOut(id=s.id, name=s.name) for s in (u.skills or [])]
    return UserOut(
        id=u.id, username=u.username, email=u.email,
        full_name=u.full_name, position=u.position,
        department=dept, skills=skills,
        bio=u.bio, avatar_url=u.avatar_url, is_admin=u.is_admin, created_at=u.created_at,
    )


def _comment_out(c: Comment) -> CommentOut:
    return CommentOut(
        id=c.id, rex_id=c.rex_id, author=_user_out(c.author),
        text=c.text, is_question=c.is_question,
        parent_id=c.parent_id, created_at=c.created_at,
    )


@router.get("/{rex_id}/comments", response_model=list[CommentOut])
async def get_comments(rex_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Comment)
        .options(selectinload(Comment.author).selectinload(User.department), selectinload(Comment.author).selectinload(User.skills))
        .where(Comment.rex_id == rex_id)
        .order_by(Comment.created_at.asc())
    )
    return [_comment_out(c) for c in result.scalars().all()]


@router.post("/{rex_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    rex_id: int,
    body: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    is_question = body.text.strip().endswith("?")
    comment = Comment(
        rex_id=rex_id, author_id=current_user.id,
        text=body.text.strip(), is_question=is_question,
        parent_id=body.parent_id,
    )
    session.add(comment)
    await session.flush()

    if rex.author_id != current_user.id:
        notif = Notification(
            user_id=rex.author_id,
            type="comment",
            rex_id=rex_id,
            actor_id=current_user.id,
            message=f"{current_user.full_name or current_user.username} commented on your REX sheet",
        )
        session.add(notif)

    if body.parent_id:
        parent = await session.get(Comment, body.parent_id)
        if parent and parent.author_id != current_user.id:
            notif = Notification(
                user_id=parent.author_id,
                type="reply",
                rex_id=rex_id,
                actor_id=current_user.id,
                message=f"{current_user.full_name or current_user.username} replied to your comment",
            )
            session.add(notif)

    await session.commit()

    result = await session.execute(
        select(Comment)
        .options(selectinload(Comment.author).selectinload(User.department), selectinload(Comment.author).selectinload(User.skills))
        .where(Comment.id == comment.id)
    )
    return _comment_out(result.scalar_one())
