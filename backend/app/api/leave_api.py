import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.leave import LeaveAllowance, LeaveRequest
from app.models.user import User
from app.schemas.leave import (
    LeaveAllowanceCreate, LeaveAllowanceResponse,
    LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/leave", tags=["leave"])


# --- Allowances ---

@router.get("/allowances", response_model=list[LeaveAllowanceResponse])
async def list_allowances(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    year: int | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LeaveAllowance).where(LeaveAllowance.workspace_id == workspace_id)
    if user_id:
        query = query.where(LeaveAllowance.user_id == user_id)
    if year:
        query = query.where(LeaveAllowance.year == year)
    result = await db.execute(query.limit(limit).offset(offset))
    allowances = result.scalars().all()
    out = []
    for a in allowances:
        resp = LeaveAllowanceResponse.model_validate(a)
        resp.remaining = a.entitlement_days + a.carried_forward - a.used_days - a.booked_days
        out.append(resp)
    return out


@router.post("/allowances", response_model=LeaveAllowanceResponse, status_code=201)
async def create_allowance(
    workspace_id: uuid.UUID,
    data: LeaveAllowanceCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    allowance = LeaveAllowance(workspace_id=workspace_id, **data.model_dump())
    db.add(allowance)
    await db.commit()
    await db.refresh(allowance)
    resp = LeaveAllowanceResponse.model_validate(allowance)
    resp.remaining = allowance.entitlement_days + allowance.carried_forward - allowance.used_days - allowance.booked_days
    return resp


# --- Requests ---

@router.get("/requests", response_model=list[LeaveRequestResponse])
async def list_leave_requests(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LeaveRequest).where(LeaveRequest.workspace_id == workspace_id).order_by(LeaveRequest.start_date.desc())
    if user_id:
        query = query.where(LeaveRequest.user_id == user_id)
    if status:
        query = query.where(LeaveRequest.status == status)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("/requests", response_model=LeaveRequestResponse, status_code=201)
async def create_leave_request(
    workspace_id: uuid.UUID,
    data: LeaveRequestCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    request = LeaveRequest(
        workspace_id=workspace_id,
        user_id=current_user.id,
        **data.model_dump(),
    )
    db.add(request)
    await db.commit()
    await db.refresh(request)
    return request


@router.put("/requests/{request_id}", response_model=LeaveRequestResponse)
async def update_leave_request(
    workspace_id: uuid.UUID,
    request_id: uuid.UUID,
    data: LeaveRequestUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == request_id, LeaveRequest.workspace_id == workspace_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    updates = data.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] in ("approved", "rejected"):
        updates["approved_by"] = current_user.id

    for field, value in updates.items():
        setattr(req, field, value)

    await db.commit()
    await db.refresh(req)
    return req
