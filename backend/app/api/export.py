"""Export REX sheets as CSV or single REX as text."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import RexSheet, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/rex/{rex_id}")
async def export_rex_text(rex_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(RexSheet)
        .options(selectinload(RexSheet.author), selectinload(RexSheet.tags))
        .where(RexSheet.id == rex_id)
    )
    rex = result.scalar_one_or_none()
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    tags_str = ", ".join(t.name for t in (rex.tags or []))
    content = (
        f"# {rex.title}\n\n"
        f"Author: {rex.author.full_name or rex.author.username}\n"
        f"Date: {rex.created_at.strftime('%Y-%m-%d')}\n"
        f"Category: {rex.category}\n"
        f"Tags: {tags_str}\n\n"
        f"## Problematic\n\n{rex.problematic}\n\n"
        f"## Solution\n\n{rex.solution}\n"
    )
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="rex-{rex_id}.md"'},
    )


@router.get("/all-rex")
async def export_all_csv(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(RexSheet)
        .options(selectinload(RexSheet.author), selectinload(RexSheet.tags))
        .where(RexSheet.status == "published")
        .order_by(RexSheet.created_at.desc())
    )
    sheets = result.scalars().unique().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Author", "Category", "Tags", "Created", "Problematic", "Solution"])
    for r in sheets:
        writer.writerow([
            r.id, r.title,
            r.author.full_name or r.author.username,
            r.category,
            "; ".join(t.name for t in (r.tags or [])),
            r.created_at.strftime("%Y-%m-%d"),
            r.problematic[:500], r.solution[:500],
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="knowledia-rex-export.csv"'},
    )
