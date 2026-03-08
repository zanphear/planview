import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.meeting import Meeting, MeetingAction
from app.models.user import User
from app.schemas.meeting import (
    MeetingCreate, MeetingUpdate, MeetingResponse,
    MeetingActionCreate, MeetingActionUpdate, MeetingActionResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/meetings", tags=["meetings"])


@router.get("", response_model=list[MeetingResponse])
async def list_meetings(
    workspace_id: uuid.UUID,
    report_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Meeting)
        .where(Meeting.workspace_id == workspace_id)
        .options(selectinload(Meeting.actions))
        .order_by(Meeting.scheduled_date.desc())
    )
    if report_id:
        query = query.where(Meeting.report_id == report_id)
    if status:
        query = query.where(Meeting.status == status)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=MeetingResponse, status_code=201)
async def create_meeting(
    workspace_id: uuid.UUID,
    data: MeetingCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = Meeting(
        workspace_id=workspace_id,
        manager_id=current_user.id,
        report_id=data.report_id,
        scheduled_date=data.scheduled_date,
        notes=data.notes,
        status="scheduled",
    )
    db.add(meeting)
    await db.commit()
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting.id).options(selectinload(Meeting.actions))
    )
    return result.scalar_one()


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.workspace_id == workspace_id).options(selectinload(Meeting.actions))
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.workspace_id == workspace_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
    await db.commit()
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id).options(selectinload(Meeting.actions))
    )
    return result.scalar_one()


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.workspace_id == workspace_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)
    await db.commit()


# --- Actions ---

@router.post("/{meeting_id}/actions", response_model=MeetingActionResponse, status_code=201)
async def add_action(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    data: MeetingActionCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    action = MeetingAction(
        meeting_id=meeting_id,
        title=data.title,
        owner_id=data.owner_id or current_user.id,
        status="open",
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return action


@router.put("/{meeting_id}/actions/{action_id}", response_model=MeetingActionResponse)
async def update_action(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    action_id: uuid.UUID,
    data: MeetingActionUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MeetingAction).join(Meeting).where(MeetingAction.id == action_id, Meeting.workspace_id == workspace_id)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(action, field, value)
    await db.commit()
    await db.refresh(action)
    return action


@router.post("/{meeting_id}/carry-forward", response_model=MeetingResponse)
async def carry_forward_actions(
    workspace_id: uuid.UUID,
    meeting_id: uuid.UUID,
    target_meeting_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    """Carry incomplete actions from this meeting to the target meeting."""
    result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id).options(selectinload(Meeting.actions))
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source meeting not found")

    for action in source.actions:
        if action.status == "open":
            new_action = MeetingAction(
                meeting_id=target_meeting_id,
                title=action.title,
                owner_id=action.owner_id,
                carried_from_id=action.id,
                status="open",
            )
            db.add(new_action)
    await db.commit()

    result = await db.execute(
        select(Meeting).where(Meeting.id == target_meeting_id).options(selectinload(Meeting.actions))
    )
    return result.scalar_one()
