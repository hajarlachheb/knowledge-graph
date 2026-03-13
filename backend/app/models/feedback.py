"""Pydantic schemas for user feedback on search answers."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class FeedbackRating(str, Enum):
    UP = "up"
    DOWN = "down"


class FeedbackCreate(BaseModel):
    query: str
    answer: str
    rating: FeedbackRating
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackOut(FeedbackCreate):
    id: int
    created_at: datetime
