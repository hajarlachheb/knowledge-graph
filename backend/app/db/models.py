"""SQLAlchemy ORM models for Knowledia — corporate knowledge management."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
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
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    department: Mapped[Department | None] = relationship(back_populates="members", lazy="selectin")
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
