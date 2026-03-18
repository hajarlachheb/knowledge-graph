"""Shared links: create password-protected, expiring share URLs for REX sheets."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import SharedLink, RexSheet, User
from app.models.schemas import SharedLinkCreate, SharedLinkOut
from app.api.deps import get_current_user
from app.auth import hash_password, verify_password

router = APIRouter(prefix="/shared", tags=["sharing"])


@router.post("/learnings/{rex_id}", response_model=SharedLinkOut, status_code=status.HTTP_201_CREATED)
async def create_shared_link(
    rex_id: int,
    body: SharedLinkCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    token = secrets.token_urlsafe(32)
    expires_at = None
    if body.expires_hours is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_hours)

    pw_hash = hash_password(body.password) if body.password else None

    link = SharedLink(
        rex_id=rex_id,
        token=token,
        expires_at=expires_at,
        password_hash=pw_hash,
    )
    session.add(link)
    await session.commit()
    await session.refresh(link)

    return SharedLinkOut(
        id=link.id,
        rex_id=link.rex_id,
        token=link.token,
        expires_at=link.expires_at,
        has_password=link.password_hash is not None,
        created_at=link.created_at,
    )


@router.get("/{token}")
async def access_shared_link(
    token: str,
    password: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(SharedLink).where(SharedLink.token == token)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.expires_at is not None:
        now = datetime.now(timezone.utc)
        expiry = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
        if now > expiry:
            raise HTTPException(status_code=410, detail="Link has expired")

    if link.password_hash:
        if not password:
            raise HTTPException(status_code=401, detail="Password required")
        if not verify_password(password, link.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

    rex = await session.get(RexSheet, link.rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    return {
        "rex_id": rex.id,
        "title": rex.title,
        "problematic": rex.problematic,
        "solution": rex.solution,
        "category": rex.category,
        "created_at": rex.created_at.isoformat(),
    }


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shared_link(
    link_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    link = await session.get(SharedLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    rex = await session.get(RexSheet, link.rex_id)
    if not rex or rex.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the creator of this link")

    await session.delete(link)
    await session.commit()
