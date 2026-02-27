import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/timeline", tags=["timeline"])


@router.get("", response_model=list[TaskResponse])
async def get_timeline(
    workspace_id: uuid.UUID,
    since: date = Query(..., description="Tasks ending after this date"),
    until: date = Query(..., description="Tasks starting before this date"),
    users: str | None = Query(None, description="Comma-separated user UUIDs"),
    project: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Task)
        .where(
            Task.workspace_id == workspace_id,
            Task.date_from.isnot(None),
            Task.date_to.isnot(None),
            Task.date_to >= since,
            Task.date_from <= until,
        )
        .options(
            selectinload(Task.assignees),
            selectinload(Task.project),
            selectinload(Task.tags),
            selectinload(Task.checklists),
            selectinload(Task.subtasks),
        )
    )

    if users:
        user_ids = [uuid.UUID(u.strip()) for u in users.split(",") if u.strip()]
        if user_ids:
            query = query.where(Task.assignees.any(User.id.in_(user_ids)))

    if project:
        query = query.where(Task.project_id == project)

    query = query.order_by(Task.date_from)
    result = await db.execute(query)
    return result.scalars().unique().all()
