import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.milestone import Milestone
from app.models.user import User
from app.schemas.milestone import MilestoneCreate, MilestoneResponse, MilestoneUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/milestones", tags=["milestones"])


@router.get("", response_model=list[MilestoneResponse])
async def list_milestones(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Milestone)
        .where(Milestone.workspace_id == workspace_id)
        .order_by(Milestone.date)
    )
    return result.scalars().all()


@router.post("", response_model=MilestoneResponse, status_code=201)
async def create_milestone(
    workspace_id: uuid.UUID,
    data: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    milestone = Milestone(
        name=data.name,
        date=data.date,
        colour=data.colour,
        project_id=data.project_id,
        workspace_id=workspace_id,
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.put("/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    workspace_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: MilestoneUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Milestone).where(
            Milestone.id == milestone_id, Milestone.workspace_id == workspace_id
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)

    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/{milestone_id}", status_code=204)
async def delete_milestone(
    workspace_id: uuid.UUID,
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Milestone).where(
            Milestone.id == milestone_id, Milestone.workspace_id == workspace_id
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    await db.delete(milestone)
    await db.commit()
