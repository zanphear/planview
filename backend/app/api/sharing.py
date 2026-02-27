import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.sharing import SharedTimeline
from app.models.task import Task
from app.models.user import User
from app.schemas.sharing import SharedTimelineCreate, SharedTimelineResponse
from app.utils.auth import get_current_user

router = APIRouter(tags=["sharing"])


@router.post(
    "/workspaces/{workspace_id}/shared-timelines",
    response_model=SharedTimelineResponse,
    status_code=201,
)
async def create_shared_timeline(
    workspace_id: uuid.UUID,
    data: SharedTimelineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = secrets.token_urlsafe(32)
    shared = SharedTimeline(
        workspace_id=workspace_id,
        token=token,
        name=data.name,
        team_id=data.team_id,
        project_id=data.project_id,
    )
    db.add(shared)
    await db.commit()
    await db.refresh(shared)
    return shared


@router.get(
    "/workspaces/{workspace_id}/shared-timelines",
    response_model=list[SharedTimelineResponse],
)
async def list_shared_timelines(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTimeline)
        .where(SharedTimeline.workspace_id == workspace_id)
        .order_by(SharedTimeline.created_at.desc())
    )
    return result.scalars().all()


@router.delete(
    "/workspaces/{workspace_id}/shared-timelines/{timeline_id}",
    status_code=204,
)
async def delete_shared_timeline(
    workspace_id: uuid.UUID,
    timeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTimeline).where(
            SharedTimeline.id == timeline_id,
            SharedTimeline.workspace_id == workspace_id,
        )
    )
    shared = result.scalar_one_or_none()
    if not shared:
        raise HTTPException(status_code=404, detail="Shared timeline not found")
    await db.delete(shared)
    await db.commit()


# Public endpoint — no auth required
@router.get("/shared/{token}/tasks")
async def get_shared_timeline_tasks(
    token: str,
    since: str | None = Query(None),
    until: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SharedTimeline).where(SharedTimeline.token == token, SharedTimeline.is_active == True)  # noqa: E712
    )
    shared = result.scalar_one_or_none()
    if not shared:
        raise HTTPException(status_code=404, detail="Shared timeline not found or inactive")

    q = (
        select(Task)
        .where(Task.workspace_id == shared.workspace_id)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.tags),
            selectinload(Task.project),
        )
    )
    if shared.project_id:
        q = q.where(Task.project_id == shared.project_id)
    if since:
        q = q.where(Task.date_to >= since)
    if until:
        q = q.where(Task.date_from <= until)

    tasks = await db.execute(q.order_by(Task.date_from))
    return tasks.scalars().all()
