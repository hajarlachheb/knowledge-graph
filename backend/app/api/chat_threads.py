"""Chat threads: list, view, and delete AI chat threads."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import ChatThread, ChatMessage, User
from app.models.schemas import ChatThreadOut, ChatThreadDetail, ChatMessageOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["ai-chat"])


@router.get("/threads", response_model=list[ChatThreadOut])
async def list_threads(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(ChatThread)
        .where(ChatThread.user_id == current_user.id)
        .order_by(ChatThread.created_at.desc())
    )
    return result.scalars().all()


@router.get("/threads/{thread_id}", response_model=ChatThreadDetail)
async def get_thread(
    thread_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = await session.get(ChatThread, thread_id)
    if not thread or thread.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Thread not found")

    msgs_result = await session.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
    )
    messages = [
        ChatMessageOut.model_validate(m) for m in msgs_result.scalars().all()
    ]
    return ChatThreadDetail(
        id=thread.id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        messages=messages,
    )


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    thread = await session.get(ChatThread, thread_id)
    if not thread or thread.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Thread not found")
    await session.delete(thread)
    await session.commit()
