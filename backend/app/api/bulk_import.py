"""Bulk import: CSV upload to preview and create REX sheets in batch."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import RexSheet, Tag, RexTag, User
from app.models.schemas import ImportPreviewRow, ImportResult
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["import"])

EXPECTED_COLUMNS = ["title", "problematic", "solution", "category", "tags", "author_email"]


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _parse_csv(content: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)


@router.post("/import/preview", response_model=list[ImportPreviewRow])
async def import_preview(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    raw = await file.read()
    content = raw.decode("utf-8-sig")
    rows = _parse_csv(content)

    preview: list[ImportPreviewRow] = []
    for idx, row in enumerate(rows, start=1):
        missing = [c for c in EXPECTED_COLUMNS if c not in row or not row[c].strip()]
        tags = [t.strip() for t in row.get("tags", "").split(",") if t.strip()]

        if missing:
            preview.append(ImportPreviewRow(
                row=idx,
                title=row.get("title", ""),
                category=row.get("category", ""),
                author_email=row.get("author_email", ""),
                tags=tags,
                status="error",
                message=f"Missing columns: {', '.join(missing)}",
            ))
            continue

        email = row["author_email"].strip()
        author_result = await session.execute(
            select(User).where(User.email == email)
        )
        author = author_result.scalar_one_or_none()

        if not author:
            preview.append(ImportPreviewRow(
                row=idx,
                title=row["title"].strip(),
                category=row["category"].strip(),
                author_email=email,
                tags=tags,
                status="warning",
                message=f"Author not found: {email}",
            ))
        else:
            preview.append(ImportPreviewRow(
                row=idx,
                title=row["title"].strip(),
                category=row["category"].strip(),
                author_email=email,
                tags=tags,
                status="ok",
            ))

    return preview


@router.post("/import/execute", response_model=ImportResult)
async def import_execute(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    raw = await file.read()
    content = raw.decode("utf-8-sig")
    rows = _parse_csv(content)

    created = 0
    skipped = 0
    errors: list[str] = []

    for idx, row in enumerate(rows, start=1):
        missing = [c for c in EXPECTED_COLUMNS if c not in row or not row[c].strip()]
        if missing:
            errors.append(f"Row {idx}: missing {', '.join(missing)}")
            skipped += 1
            continue

        email = row["author_email"].strip()
        author_result = await session.execute(
            select(User).where(User.email == email)
        )
        author = author_result.scalar_one_or_none()
        if not author:
            errors.append(f"Row {idx}: author not found ({email})")
            skipped += 1
            continue

        rex = RexSheet(
            author_id=author.id,
            title=row["title"].strip(),
            problematic=row["problematic"].strip(),
            solution=row["solution"].strip(),
            category=row["category"].strip(),
        )
        session.add(rex)
        await session.flush()

        tag_names = [t.strip() for t in row.get("tags", "").split(",") if t.strip()]
        for tname in tag_names:
            tag_result = await session.execute(
                select(Tag).where(Tag.name == tname)
            )
            tag = tag_result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tname)
                session.add(tag)
                await session.flush()
            session.add(RexTag(rex_id=rex.id, tag_id=tag.id))

        created += 1

    await session.commit()
    return ImportResult(created=created, skipped=skipped, errors=errors)


@router.get("/import/template")
async def import_template(
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(EXPECTED_COLUMNS)
    writer.writerow([
        "Example: Deployment failure on prod",
        "The CI pipeline failed during blue-green deploy",
        "Added health-check retry logic",
        "lesson-learned",
        "devops,ci-cd",
        "alice@example.com",
    ])

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rex_import_template.csv"},
    )
