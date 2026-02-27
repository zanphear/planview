import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task_dependency import TaskDependency
from app.models.user import User
from app.schemas.task_dependency import DependencyCreate, DependencyResponse
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/dependencies",
    tags=["dependencies"],
)


@router.get("", response_model=list[DependencyResponse])
async def list_dependencies(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(TaskDependency).join(
        TaskDependency.blocker
    ).where(
        TaskDependency.blocker.has(workspace_id=workspace_id)
    )
    if task_id:
        q = q.where(
            (TaskDependency.blocker_id == task_id)
            | (TaskDependency.blocked_id == task_id)
        )
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=DependencyResponse, status_code=201)
async def create_dependency(
    workspace_id: uuid.UUID,
    data: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.blocker_id == data.blocked_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")

    existing = await db.execute(
        select(TaskDependency).where(
            TaskDependency.blocker_id == data.blocker_id,
            TaskDependency.blocked_id == data.blocked_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Dependency already exists")

    dep = TaskDependency(
        blocker_id=data.blocker_id,
        blocked_id=data.blocked_id,
        dependency_type=data.dependency_type,
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


@router.delete("/{dependency_id}", status_code=204)
async def delete_dependency(
    workspace_id: uuid.UUID,
    dependency_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskDependency).where(TaskDependency.id == dependency_id)
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    await db.delete(dep)
    await db.commit()
