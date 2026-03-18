"""Compliance: mandatory REX attestation tracking."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import RexSheet, Attestation, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/mandatory")
async def list_mandatory_unattested(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    attested_result = await session.execute(
        select(Attestation.rex_id).where(Attestation.user_id == current_user.id)
    )
    attested_ids = {row[0] for row in attested_result.all()}

    result = await session.execute(
        select(RexSheet).where(RexSheet.mandatory == True)  # noqa: E712
    )
    sheets = result.scalars().all()
    return [
        {
            "rex_id": r.id,
            "title": r.title,
            "category": r.category,
            "created_at": r.created_at.isoformat(),
        }
        for r in sheets
        if r.id not in attested_ids
    ]


@router.post("/attest/{rex_id}", status_code=status.HTTP_201_CREATED)
async def attest_rex(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex or not rex.mandatory:
        raise HTTPException(status_code=404, detail="Mandatory REX not found")

    existing = await session.execute(
        select(Attestation).where(
            Attestation.user_id == current_user.id,
            Attestation.rex_id == rex_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"detail": "Already attested"}

    session.add(Attestation(user_id=current_user.id, rex_id=rex_id))
    await session.commit()
    return {"detail": "Attested"}


@router.get("/attestations/{rex_id}")
async def list_attestations(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    result = await session.execute(
        select(Attestation).where(Attestation.rex_id == rex_id)
    )
    attestations = result.scalars().all()

    out = []
    for a in attestations:
        user = await session.get(User, a.user_id)
        out.append({
            "user_id": a.user_id,
            "user_name": (user.full_name or user.username) if user else "Unknown",
            "attested_at": a.attested_at.isoformat(),
        })
    return out
