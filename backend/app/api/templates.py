import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task_template import TaskTemplate
from app.models.user import User
from app.schemas.task_template import (
    TaskTemplateCreate,
    TaskTemplateResponse,
    TaskTemplateUpdate,
)
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/templates",
    tags=["templates"],
)


@router.get("", response_model=list[TaskTemplateResponse])
async def list_templates(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskTemplate)
        .where(TaskTemplate.workspace_id == workspace_id)
        .order_by(TaskTemplate.name)
    )
    return result.scalars().all()


@router.post("", response_model=TaskTemplateResponse, status_code=201)
async def create_template(
    workspace_id: uuid.UUID,
    data: TaskTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = TaskTemplate(
        name=data.name,
        description=data.description,
        colour=data.colour,
        status=data.status,
        time_estimate_minutes=data.time_estimate_minutes,
        checklist_items=data.checklist_items,
        tag_names=data.tag_names,
        workspace_id=workspace_id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/{template_id}", response_model=TaskTemplateResponse)
async def update_template(
    workspace_id: uuid.UUID,
    template_id: uuid.UUID,
    data: TaskTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskTemplate).where(
            TaskTemplate.id == template_id,
            TaskTemplate.workspace_id == workspace_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(template, k, v)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    workspace_id: uuid.UUID,
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskTemplate).where(
            TaskTemplate.id == template_id,
            TaskTemplate.workspace_id == workspace_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
