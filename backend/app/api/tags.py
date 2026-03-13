"""Tags router: list tags."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import RexTag, Tag
from app.models.schemas import TagOut

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagOut])
async def list_tags(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Tag.id, Tag.name, func.count(RexTag.rex_id).label("rex_count"))
        .outerjoin(RexTag, Tag.id == RexTag.tag_id)
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(RexTag.rex_id).desc())
    )
    rows = result.all()
    return [TagOut(id=r.id, name=r.name, rex_count=r.rex_count) for r in rows]
