"""Feedback API — thumbs up/down on search results."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Feedback as FeedbackRow
from app.models.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut)
async def submit_feedback(
    body: FeedbackCreate,
    session: AsyncSession = Depends(get_session),
):
    row = FeedbackRow(
        query=body.query,
        answer=body.answer,
        rating=body.rating.value,
        comment=body.comment,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return FeedbackOut(
        id=row.id,
        query=row.query,
        answer=row.answer,
        rating=body.rating,
        comment=row.comment,
        created_at=row.created_at,
    )
