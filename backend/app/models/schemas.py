"""Pydantic schemas for the Knowledia API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=200)
    position: str = Field(default="", max_length=200)
    department_id: int | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Departments ───────────────────────────────────────

class DepartmentOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    member_count: int = 0

    model_config = {"from_attributes": True}


# ── Skills ────────────────────────────────────────────

class SkillOut(BaseModel):
    id: int
    name: str
    user_count: int = 0

    model_config = {"from_attributes": True}


# ── Users ─────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str = ""
    position: str = ""
    department: DepartmentOut | None = None
    skills: list[SkillOut] = []
    bio: str | None = None
    avatar_url: str | None = None
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfile(UserOut):
    rex_count: int = 0
    contributor_score: int = 0
    is_trusted: bool = False
    follower_count: int = 0
    following_count: int = 0
    is_followed: bool = False
    total_views: int = 0


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    position: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=2000)
    department_id: int | None = None


class SkillsUpdate(BaseModel):
    skills: list[str] = Field(default_factory=list, max_length=20)


# ── Tags ──────────────────────────────────────────────

class TagOut(BaseModel):
    id: int
    name: str
    rex_count: int = 0

    model_config = {"from_attributes": True}


# ── REX Sheets ────────────────────────────────────────

REX_CATEGORIES = ["lesson-learned", "best-practice", "incident", "process-improvement", "technical-guide"]

class RexCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    problematic: str = Field(min_length=1)
    solution: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=10)
    category: str = Field(default="lesson-learned")
    status: str = Field(default="published")


class RexUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    problematic: str | None = None
    solution: str | None = None
    tags: list[str] | None = None
    category: str | None = None
    status: str | None = None


class RexOut(BaseModel):
    id: int
    title: str
    problematic: str
    solution: str
    category: str = "lesson-learned"
    status: str = "published"
    created_at: datetime
    updated_at: datetime
    author: UserOut
    tags: list[TagOut] = []
    bookmark_count: int = 0
    is_bookmarked: bool = False
    vote_score: int = 0
    user_vote: int = 0
    view_count: int = 0
    comment_count: int = 0

    model_config = {"from_attributes": True}


class RexListOut(BaseModel):
    items: list[RexOut]
    total: int
    page: int
    page_size: int


# ── Comments ─────────────────────────────────────────

class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    rex_id: int
    author: UserOut
    text: str
    is_question: bool = False
    parent_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Bookmarks ─────────────────────────────────────────

class BookmarkOut(BaseModel):
    rex_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Votes ─────────────────────────────────────────────

class VoteIn(BaseModel):
    value: int = Field(..., ge=-1, le=1)


# ── Notifications ─────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    type: str
    rex_id: int | None = None
    actor_id: int | None = None
    actor_name: str = ""
    message: str = ""
    read: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Leaderboard ───────────────────────────────────────

class ContributorOut(BaseModel):
    id: int
    full_name: str
    position: str
    department: DepartmentOut | None = None
    rex_count: int = 0
    total_votes: int = 0
    contributor_score: int = 0
    is_trusted: bool = False
    top_tags: list[str] = []


# ── Follow ────────────────────────────────────────────

class FollowOut(BaseModel):
    follower_id: int
    followed_id: int
    created_at: datetime


# ── Activity ──────────────────────────────────────────

class ActivityItem(BaseModel):
    id: str
    type: str  # new_rex, comment, vote, new_user
    actor_name: str
    actor_id: int
    message: str
    rex_id: int | None = None
    rex_title: str | None = None
    created_at: datetime


# ── Knowledge Graph ───────────────────────────────────

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    meta: dict = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
