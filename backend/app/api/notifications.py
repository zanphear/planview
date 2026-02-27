import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationMarkRead, NotificationResponse
from app.services.notification_service import get_user_notifications, mark_read, unread_count
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/notifications",
    tags=["notifications"],
)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    workspace_id: uuid.UUID,
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_notifications(db, current_user.id, workspace_id, unread_only=unread_only)


@router.get("/unread-count")
async def get_unread_count(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await unread_count(db, current_user.id, workspace_id)
    return {"count": count}


@router.post("/mark-read")
async def mark_notifications_read(
    workspace_id: uuid.UUID,
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await mark_read(db, current_user.id, data.notification_ids)
    return {"updated": updated}
