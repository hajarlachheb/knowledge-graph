"""File attachments for REX sheets: upload, download, delete."""

from __future__ import annotations

import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_session
from app.db.models import Attachment, RexSheet, User
from app.models.schemas import AttachmentOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/attachments", tags=["attachments"])

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/learnings/{rex_id}/upload", response_model=AttachmentOut, status_code=201)
async def upload_file(
    rex_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rex = await session.get(RexSheet, rex_id)
    if not rex:
        raise HTTPException(status_code=404, detail="REX sheet not found")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    safe_name = f"{rex_id}_{current_user.id}_{file.filename}"
    storage_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(storage_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        rex_id=rex_id,
        filename=file.filename or "untitled",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
        storage_path=storage_path,
    )
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)
    return attachment


@router.get("/{attachment_id}/download")
async def download_file(
    attachment_id: int,
    session: AsyncSession = Depends(get_session),
):
    attachment = await session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.isfile(attachment.storage_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=attachment.storage_path,
        filename=attachment.filename,
        media_type=attachment.content_type,
    )


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    attachment = await session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    rex = await session.get(RexSheet, attachment.rex_id)
    if not rex or rex.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the REX author can delete attachments")

    if os.path.isfile(attachment.storage_path):
        os.remove(attachment.storage_path)

    await session.delete(attachment)
    await session.commit()
    return {"status": "deleted"}


@router.get("/learnings/{rex_id}", response_model=list[AttachmentOut])
async def list_attachments(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Attachment)
        .where(Attachment.rex_id == rex_id)
        .order_by(Attachment.created_at.desc())
    )
    return result.scalars().all()
