import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.export_service import export_tasks_csv, export_tasks_json, export_tasks_ics
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/export",
    tags=["export"],
)


@router.get("/tasks.csv")
async def export_csv(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await export_tasks_csv(db, workspace_id, {"project_id": project_id})
    return PlainTextResponse(content, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=tasks.csv"
    })


@router.get("/tasks.json")
async def export_json(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await export_tasks_json(db, workspace_id, {"project_id": project_id})
    return PlainTextResponse(content, media_type="application/json", headers={
        "Content-Disposition": "attachment; filename=tasks.json"
    })


@router.get("/tasks.ics")
async def export_ics(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await export_tasks_ics(db, workspace_id, {"project_id": project_id})
    return PlainTextResponse(content, media_type="text/calendar", headers={
        "Content-Disposition": "attachment; filename=tasks.ics"
    })
