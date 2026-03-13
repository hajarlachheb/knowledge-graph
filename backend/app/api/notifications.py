"""Notifications router."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Notification, User
from app.models.schemas import NotificationOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def get_notifications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifs = result.scalars().all()
    return [
        NotificationOut(
            id=n.id, type=n.type, rex_id=n.rex_id,
            actor_id=n.actor_id,
            actor_name=(n.actor.full_name or n.actor.username) if n.actor else "",
            message=n.message, read=n.read, created_at=n.created_at,
        )
        for n in notifs
    ]


@router.get("/unread-count")
async def unread_count(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id, Notification.read == False)
    )
    return {"count": result.scalar() or 0}


@router.post("/read-all")
async def mark_all_read(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await session.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read == False)
        .values(read=True)
    )
    await session.commit()
    return {"status": "ok"}


@router.post("/{notif_id}/read")
async def mark_read(
    notif_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    notif = await session.get(Notification, notif_id)
    if notif and notif.user_id == current_user.id:
        notif.read = True
        await session.commit()
    return {"status": "ok"}
