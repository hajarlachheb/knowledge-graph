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


# ── Reactions (Batch 2) ──────────────────────────────

REACTION_TYPES = ["helpful", "applied", "insightful", "outdated"]

class ReactionIn(BaseModel):
    type: str = Field(..., description="One of: helpful, applied, insightful, outdated")

class ReactionOut(BaseModel):
    id: int
    user_id: int
    rex_id: int
    type: str
    created_at: datetime
    model_config = {"from_attributes": True}

class ReactionSummary(BaseModel):
    helpful: int = 0
    applied: int = 0
    insightful: int = 0
    outdated: int = 0
    user_reactions: list[str] = []


# ── Saved Searches (Batch 3) ────────────────────────

class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    filters_json: str = "{}"
    notify: bool = False

class SavedSearchOut(BaseModel):
    id: int
    name: str
    filters_json: str
    notify: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Attachments (Batch 4) ───────────────────────────

class AttachmentOut(BaseModel):
    id: int
    rex_id: int
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── REX Templates (Batch 5) ─────────────────────────

class RexTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    category: str = "lesson-learned"
    fields_json: str = "{}"

class RexTemplateOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    fields_json: str
    is_system: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Chat Threads (Batch 7) ──────────────────────────

class ChatThreadOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class ChatMessageOut(BaseModel):
    id: int
    thread_id: int
    role: str
    content: str
    references_json: str = "[]"
    created_at: datetime
    model_config = {"from_attributes": True}

class ChatThreadDetail(ChatThreadOut):
    messages: list[ChatMessageOut] = []


# ── Endorsements (Batch 8) ──────────────────────────

class EndorseIn(BaseModel):
    skill_id: int

class EndorsementOut(BaseModel):
    id: int
    endorser_id: int
    endorsed_id: int
    skill_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class SkillEndorsementOut(BaseModel):
    skill: SkillOut
    count: int = 0
    endorsed_by_me: bool = False


# ── Badges (Batch 8) ────────────────────────────────

class BadgeOut(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    criteria_type: str
    criteria_value: int
    model_config = {"from_attributes": True}

class UserBadgeOut(BaseModel):
    badge: BadgeOut
    awarded_at: datetime


# ── Collections (Batch 9) ───────────────────────────

class CollectionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    is_public: bool = True

class CollectionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None

class CollectionItemAdd(BaseModel):
    rex_id: int
    position: int = 0
    note: str = ""

class CollectionItemOut(BaseModel):
    id: int
    rex_id: int
    position: int
    note: str
    rex_title: str = ""
    model_config = {"from_attributes": True}

class CollectionOut(BaseModel):
    id: int
    title: str
    description: str
    is_public: bool
    creator_id: int
    creator_name: str = ""
    item_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}

class CollectionDetail(CollectionOut):
    items: list[CollectionItemOut] = []


# ── Audit Log (Batch 10) ────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    details_json: str
    ip_address: str
    created_at: datetime
    user_name: str = ""
    model_config = {"from_attributes": True}

class SearchLogOut(BaseModel):
    id: int
    user_id: int | None
    query: str
    results_count: int
    created_at: datetime
    model_config = {"from_attributes": True}

class ContentHealthItem(BaseModel):
    rex_id: int
    title: str
    author_name: str
    days_since_update: int
    view_count: int
    vote_score: int
    comment_count: int
    status: str  # stale, low-engagement, orphaned-tags


# ── Email Preferences (Batch 11) ────────────────────

class EmailPreferenceOut(BaseModel):
    weekly_digest: bool = True
    new_from_followed: bool = True
    saved_search_alerts: bool = True
    model_config = {"from_attributes": True}

class EmailPreferenceUpdate(BaseModel):
    weekly_digest: bool | None = None
    new_from_followed: bool | None = None
    saved_search_alerts: bool | None = None


# ── Moderation (Batch 11) ───────────────────────────

class FlagIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)

class ModerationItem(BaseModel):
    rex_id: int
    title: str
    author_name: str
    flagged_reason: str | None
    created_at: datetime


# ── Roles (Batch 12) ────────────────────────────────

class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    permissions_json: str = "[]"

class RoleOut(BaseModel):
    id: int
    name: str
    permissions_json: str
    model_config = {"from_attributes": True}


# ── Shared Links (Batch 13) ─────────────────────────

class SharedLinkCreate(BaseModel):
    expires_hours: int | None = None
    password: str | None = None

class SharedLinkOut(BaseModel):
    id: int
    rex_id: int
    token: str
    expires_at: datetime | None
    has_password: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Bulk Import (Batch 13) ──────────────────────────

class ImportPreviewRow(BaseModel):
    row: int
    title: str
    category: str
    author_email: str
    tags: list[str]
    status: str  # ok, warning, error
    message: str = ""

class ImportResult(BaseModel):
    created: int
    skipped: int
    errors: list[str]
