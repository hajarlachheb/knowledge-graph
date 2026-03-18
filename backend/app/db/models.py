"""SQLAlchemy ORM models for Knowledgia — corporate knowledge management."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    members: Mapped[list[User]] = relationship(back_populates="department", lazy="selectin")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[str] = mapped_column(String(200), default="")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), index=True, default=None)
    bio: Mapped[str | None] = mapped_column(Text, default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(500), default=None)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    role_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id"), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped[Department | None] = relationship(back_populates="members", lazy="selectin")
    role: Mapped[Role | None] = relationship(lazy="selectin")
    skills: Mapped[list[Skill]] = relationship(secondary="user_skills", back_populates="users", lazy="selectin")
    rex_sheets: Mapped[list[RexSheet]] = relationship(back_populates="author", lazy="selectin")
    bookmarks: Mapped[list[Bookmark]] = relationship(back_populates="user", lazy="selectin")
    votes: Mapped[list[Vote]] = relationship(back_populates="user", lazy="selectin")
    comments: Mapped[list[Comment]] = relationship(back_populates="author", lazy="selectin")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user", foreign_keys="Notification.user_id", lazy="selectin")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)

    users: Mapped[list[User]] = relationship(secondary="user_skills", back_populates="skills", lazy="selectin")


class UserSkill(Base):
    __tablename__ = "user_skills"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)


class RexSheet(Base):
    __tablename__ = "rex_sheets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    problematic: Mapped[str] = mapped_column(Text)
    solution: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), default="lesson-learned")
    status: Mapped[str] = mapped_column(String(20), default="published")  # draft | published
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged_reason: Mapped[str | None] = mapped_column(Text, default=None)
    approved: Mapped[bool] = mapped_column(Boolean, default=True)
    mandatory: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    author: Mapped[User] = relationship(back_populates="rex_sheets", lazy="selectin")
    tags: Mapped[list[Tag]] = relationship(secondary="rex_tags", back_populates="rex_sheets", lazy="selectin")
    bookmarked_by: Mapped[list[Bookmark]] = relationship(back_populates="rex_sheet", lazy="selectin")
    votes_rel: Mapped[list[Vote]] = relationship(back_populates="rex_sheet", lazy="selectin")
    comments_rel: Mapped[list[Comment]] = relationship(back_populates="rex_sheet", lazy="selectin")
    views_rel: Mapped[list[RexView]] = relationship(back_populates="rex_sheet", lazy="selectin")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    rex_sheets: Mapped[list[RexSheet]] = relationship(secondary="rex_tags", back_populates="tags", lazy="selectin")


class RexTag(Base):
    __tablename__ = "rex_tags"

    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="bookmarks", lazy="selectin")
    rex_sheet: Mapped[RexSheet] = relationship(back_populates="bookmarked_by", lazy="selectin")


class Vote(Base):
    __tablename__ = "votes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), primary_key=True)
    value: Mapped[int] = mapped_column(SmallInteger)  # +1 upvote, -1 downvote
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="votes", lazy="selectin")
    rex_sheet: Mapped[RexSheet] = relationship(back_populates="votes_rel", lazy="selectin")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    is_question: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    author: Mapped[User] = relationship(back_populates="comments", lazy="selectin")
    rex_sheet: Mapped[RexSheet] = relationship(back_populates="comments_rel", lazy="selectin")
    replies: Mapped[list[Comment]] = relationship(back_populates="parent", lazy="selectin")
    parent: Mapped[Comment | None] = relationship(back_populates="replies", remote_side=[id], lazy="selectin")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(30))  # vote, comment, reply, follow, new_rex
    rex_id: Mapped[int | None] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), default=None)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), default=None)
    message: Mapped[str] = mapped_column(String(500), default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship(back_populates="notifications", foreign_keys=[user_id], lazy="selectin")
    actor: Mapped[User | None] = relationship(foreign_keys=[actor_id], lazy="selectin")


class RexView(Base):
    __tablename__ = "rex_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rex_sheet: Mapped[RexSheet] = relationship(back_populates="views_rel", lazy="selectin")


class Follow(Base):
    __tablename__ = "follows"

    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followed_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Reactions (Batch 2) ───────────────────────────────

class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (UniqueConstraint("user_id", "rex_id", "type", name="uq_reaction"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(30))  # helpful, applied, insightful, outdated
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Saved Searches (Batch 3) ─────────────────────────

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    filters_json: Mapped[str] = mapped_column(Text, default="{}")
    notify: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Attachments (Batch 4) ────────────────────────────

class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(200), default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    storage_path: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rex_sheet: Mapped[RexSheet] = relationship(lazy="selectin")


# ── REX Templates (Batch 5) ─────────────────────────

class RexTemplate(Base):
    __tablename__ = "rex_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(50), default="lesson-learned")
    fields_json: Mapped[str] = mapped_column(Text, default="{}")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Embeddings (Batch 6) ─────────────────────────────

class RexEmbedding(Base):
    __tablename__ = "rex_embeddings"

    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), primary_key=True)
    embedding_blob: Mapped[bytes] = mapped_column(LargeBinary)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Chat Threads (Batch 7) ──────────────────────────

class ChatThread(Base):
    __tablename__ = "chat_threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    messages: Mapped[list[ChatMessage]] = relationship(back_populates="thread", lazy="selectin", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    references_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    thread: Mapped[ChatThread] = relationship(back_populates="messages", lazy="selectin")


# ── Endorsements (Batch 8) ──────────────────────────

class Endorsement(Base):
    __tablename__ = "endorsements"
    __table_args__ = (UniqueConstraint("endorser_id", "endorsed_id", "skill_id", name="uq_endorsement"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endorser_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    endorsed_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Badges / Gamification (Batch 8) ─────────────────

class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(50), default="star")
    criteria_type: Mapped[str] = mapped_column(String(50))  # rex_count, vote_count, reaction_count, streak, etc.
    criteria_value: Mapped[int] = mapped_column(Integer, default=1)


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    badge_id: Mapped[int] = mapped_column(ForeignKey("badges.id", ondelete="CASCADE"), index=True)
    awarded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Collections (Batch 9) ───────────────────────────

class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    creator: Mapped[User] = relationship(lazy="selectin")
    items: Mapped[list[CollectionItem]] = relationship(back_populates="collection", lazy="selectin", order_by="CollectionItem.position")


class CollectionItem(Base):
    __tablename__ = "collection_items"
    __table_args__ = (UniqueConstraint("collection_id", "rex_id", name="uq_collection_rex"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"), index=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, default="")

    collection: Mapped[Collection] = relationship(back_populates="items", lazy="selectin")
    rex_sheet: Mapped[RexSheet] = relationship(lazy="selectin")


# ── Audit Log (Batch 10) ────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, default=None)
    action: Mapped[str] = mapped_column(String(50))  # create, update, delete, login, admin_action
    entity_type: Mapped[str] = mapped_column(String(50), default="")
    entity_id: Mapped[int | None] = mapped_column(Integer, default=None)
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    ip_address: Mapped[str] = mapped_column(String(50), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SearchLog(Base):
    __tablename__ = "search_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, default=None)
    query: Mapped[str] = mapped_column(String(500))
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Email Preferences (Batch 11) ────────────────────

class EmailPreference(Base):
    __tablename__ = "email_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    weekly_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    new_from_followed: Mapped[bool] = mapped_column(Boolean, default=True)
    saved_search_alerts: Mapped[bool] = mapped_column(Boolean, default=True)


# ── Attestations / Compliance (Batch 11) ─────────────

class Attestation(Base):
    __tablename__ = "attestations"
    __table_args__ = (UniqueConstraint("user_id", "rex_id", name="uq_attestation"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    attested_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Roles (Batch 12) ────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    permissions_json: Mapped[str] = mapped_column(Text, default="[]")


# ── Shared Links (Batch 13) ─────────────────────────

class SharedLink(Base):
    __tablename__ = "shared_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rex_id: Mapped[int] = mapped_column(ForeignKey("rex_sheets.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    password_hash: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rex_sheet: Mapped[RexSheet] = relationship(lazy="selectin")
