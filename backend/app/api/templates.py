"""REX templates: predefined structures for creating REX sheets."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import RexTemplate, User
from app.models.schemas import RexTemplateCreate, RexTemplateOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=list[RexTemplateOut])
async def list_templates(
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(RexTemplate).order_by(RexTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{template_id}", response_model=RexTemplateOut)
async def get_template(
    template_id: int,
    session: AsyncSession = Depends(get_session),
):
    template = await session.get(RexTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/", response_model=RexTemplateOut, status_code=201)
async def create_template(
    body: RexTemplateCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    template = RexTemplate(
        name=body.name,
        description=body.description,
        category=body.category,
        fields_json=body.fields_json,
    )
    session.add(template)
    await session.commit()
    await session.refresh(template)
    return template


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    template = await session.get(RexTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system templates")

    await session.delete(template)
    await session.commit()
    return {"status": "deleted"}
