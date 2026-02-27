import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.time_off import TimeOff
from app.models.user import User
from app.schemas.time_off import TimeOffCreate, TimeOffResponse, TimeOffUpdate
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/time-off",
    tags=["time-off"],
)


@router.get("", response_model=list[TimeOffResponse])
async def list_time_off(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    since: str | None = Query(None),
    until: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(TimeOff)
        .where(TimeOff.workspace_id == workspace_id)
        .options(selectinload(TimeOff.user))
        .order_by(TimeOff.date_from)
    )
    if user_id:
        q = q.where(TimeOff.user_id == user_id)
    if since:
        q = q.where(TimeOff.date_to >= since)
    if until:
        q = q.where(TimeOff.date_from <= until)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=TimeOffResponse, status_code=201)
async def create_time_off(
    workspace_id: uuid.UUID,
    data: TimeOffCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    time_off = TimeOff(
        user_id=data.user_id,
        workspace_id=workspace_id,
        date_from=data.date_from,
        date_to=data.date_to,
        reason=data.reason,
        colour=data.colour,
    )
    db.add(time_off)
    await db.commit()

    result = await db.execute(
        select(TimeOff)
        .where(TimeOff.id == time_off.id)
        .options(selectinload(TimeOff.user))
    )
    return result.scalar_one()


@router.put("/{time_off_id}", response_model=TimeOffResponse)
async def update_time_off(
    workspace_id: uuid.UUID,
    time_off_id: uuid.UUID,
    data: TimeOffUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeOff).where(TimeOff.id == time_off_id, TimeOff.workspace_id == workspace_id)
    )
    time_off = result.scalar_one_or_none()
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(time_off, field, value)
    await db.commit()
    await db.refresh(time_off)
    return time_off


@router.delete("/{time_off_id}", status_code=204)
async def delete_time_off(
    workspace_id: uuid.UUID,
    time_off_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeOff).where(TimeOff.id == time_off_id, TimeOff.workspace_id == workspace_id)
    )
    time_off = result.scalar_one_or_none()
    if not time_off:
        raise HTTPException(status_code=404, detail="Time off not found")
    await db.delete(time_off)
    await db.commit()
