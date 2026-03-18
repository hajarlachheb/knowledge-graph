"""Endorsements: endorse skills of other users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Endorsement, Skill, UserSkill
from app.models.schemas import EndorseIn, SkillEndorsementOut, SkillOut
from app.api.deps import get_current_user
from app.db.models import User

router = APIRouter(prefix="/users", tags=["endorsements"])


@router.post("/{user_id}/endorse", status_code=status.HTTP_201_CREATED)
async def endorse_skill(
    user_id: int,
    body: EndorseIn,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot endorse yourself")

    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    skill = await session.get(Skill, body.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    result = await session.execute(
        select(Endorsement).where(
            Endorsement.endorser_id == current_user.id,
            Endorsement.endorsed_id == user_id,
            Endorsement.skill_id == body.skill_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"detail": "Already endorsed"}

    session.add(Endorsement(
        endorser_id=current_user.id,
        endorsed_id=user_id,
        skill_id=body.skill_id,
    ))
    await session.commit()
    return {"detail": "Endorsed"}


@router.delete("/{user_id}/endorse/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_endorsement(
    user_id: int,
    skill_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Endorsement).where(
            Endorsement.endorser_id == current_user.id,
            Endorsement.endorsed_id == user_id,
            Endorsement.skill_id == skill_id,
        )
    )
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Endorsement not found")
    await session.delete(existing)
    await session.commit()


@router.get("/{user_id}/endorsements", response_model=list[SkillEndorsementOut])
async def get_endorsements(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(UserSkill.skill_id).where(UserSkill.user_id == user_id)
    )
    skill_ids = [row[0] for row in result.all()]

    out: list[SkillEndorsementOut] = []
    for sid in skill_ids:
        skill = await session.get(Skill, sid)
        if not skill:
            continue

        count_result = await session.execute(
            select(func.count()).select_from(Endorsement).where(
                Endorsement.endorsed_id == user_id,
                Endorsement.skill_id == sid,
            )
        )
        count = count_result.scalar() or 0

        mine_result = await session.execute(
            select(Endorsement).where(
                Endorsement.endorser_id == current_user.id,
                Endorsement.endorsed_id == user_id,
                Endorsement.skill_id == sid,
            )
        )
        endorsed_by_me = mine_result.scalar_one_or_none() is not None

        out.append(SkillEndorsementOut(
            skill=SkillOut(id=skill.id, name=skill.name),
            count=count,
            endorsed_by_me=endorsed_by_me,
        ))
    return out
