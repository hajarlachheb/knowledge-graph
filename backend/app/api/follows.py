"""Follow system — follow/unfollow users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Follow, Notification, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/follows", tags=["follows"])


@router.post("/{user_id}")
async def follow_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await session.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.followed_id == user_id)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_following"}

    session.add(Follow(follower_id=current_user.id, followed_id=user_id))
    session.add(Notification(
        user_id=user_id, type="follow", actor_id=current_user.id,
        message=f"{current_user.full_name or current_user.username} started following you",
    ))
    await session.commit()
    return {"status": "followed"}


@router.delete("/{user_id}")
async def unfollow_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.followed_id == user_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await session.delete(existing)
        await session.commit()
    return {"status": "unfollowed"}


@router.get("/{user_id}/followers")
async def get_followers(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Follow.follower_id).where(Follow.followed_id == user_id)
    )
    return {"follower_ids": [r[0] for r in result.all()]}


@router.get("/{user_id}/following")
async def get_following(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Follow.followed_id).where(Follow.follower_id == user_id)
    )
    return {"following_ids": [r[0] for r in result.all()]}
