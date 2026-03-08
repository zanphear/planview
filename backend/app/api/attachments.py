import os
import uuid

import magic
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.attachment import AttachmentResponse
from app.utils.auth import get_workspace_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/tasks/{task_id}/attachments",
    tags=["attachments"],
)

# Map extensions to expected MIME prefixes for magic-byte validation
_EXT_MIME_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    ".svg": "image/svg+xml", ".pdf": "application/pdf",
    ".zip": "application/zip", ".gz": "application/gzip",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
}


def _validate_mime(content: bytes, ext: str) -> str:
    detected = magic.from_buffer(content[:2048], mime=True)
    expected = _EXT_MIME_MAP.get(ext)
    if expected and detected != expected:
        # Allow application/octet-stream as a fallback for some formats
        if detected != "application/octet-stream":
            raise HTTPException(
                status_code=400,
                detail=f"File content ({detected}) doesn't match extension ({ext})",
            )
    return detected


@router.get("", response_model=list[AttachmentResponse])
async def list_attachments(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attachment)
        .where(Attachment.task_id == task_id)
        .options(selectinload(Attachment.uploader))
        .order_by(Attachment.created_at.desc())
    )
    return result.scalars().all()


ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".md", ".json", ".xml",
    ".zip", ".tar", ".gz", ".7z",
    ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg",
}

BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".ps1",
    ".sh", ".bash", ".csh", ".dll", ".so", ".dylib",
}


@router.post("", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} is not allowed")
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} is not supported")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")

    # Validate magic bytes match extension
    detected_mime = _validate_mime(content, ext)

    task_dir = os.path.join(settings.upload_dir, str(workspace_id), str(task_id))
    os.makedirs(task_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{ext}"
    file_path = os.path.join(task_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(content)

    attachment = Attachment(
        filename=file.filename or "untitled",
        file_path=file_path,
        file_size=len(content),
        mime_type=detected_mime or file.content_type or "application/octet-stream",
        task_id=task_id,
        uploaded_by=current_user.id,
    )
    db.add(attachment)
    await db.commit()

    result = await db.execute(
        select(Attachment)
        .where(Attachment.id == attachment.id)
        .options(selectinload(Attachment.uploader))
    )
    return result.scalar_one()


@router.get("/{attachment_id}/download")
async def download_attachment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attachment).where(Attachment.id == attachment_id, Attachment.task_id == task_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        attachment.file_path,
        filename=attachment.filename,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{attachment.filename}"'},
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attachment).where(Attachment.id == attachment_id, Attachment.task_id == task_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if attachment.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own attachments")

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    await db.delete(attachment)
    await db.commit()
