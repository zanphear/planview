import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.objective import ReviewPeriod, Objective, KeyResult
from app.models.user import User
from app.schemas.objective import (
    ReviewPeriodCreate, ReviewPeriodResponse,
    ObjectiveCreate, ObjectiveUpdate, ObjectiveResponse,
    KeyResultCreate, KeyResultUpdate, KeyResultResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["objectives"])


# --- Review Periods ---

@router.get("/review-periods", response_model=list[ReviewPeriodResponse])
async def list_review_periods(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReviewPeriod).where(ReviewPeriod.workspace_id == workspace_id).order_by(ReviewPeriod.start_date.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/review-periods", response_model=ReviewPeriodResponse, status_code=201)
async def create_review_period(
    workspace_id: uuid.UUID,
    data: ReviewPeriodCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    period = ReviewPeriod(workspace_id=workspace_id, **data.model_dump())
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return period


# --- Objectives ---

@router.get("/objectives", response_model=list[ObjectiveResponse])
async def list_objectives(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    review_period_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Objective)
        .where(Objective.workspace_id == workspace_id)
        .options(selectinload(Objective.key_results))
        .order_by(Objective.created_at.desc())
    )
    if user_id:
        query = query.where(Objective.user_id == user_id)
    if review_period_id:
        query = query.where(Objective.review_period_id == review_period_id)
    if status:
        query = query.where(Objective.status == status)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("/objectives", response_model=ObjectiveResponse, status_code=201)
async def create_objective(
    workspace_id: uuid.UUID,
    data: ObjectiveCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    obj = Objective(
        workspace_id=workspace_id,
        user_id=data.user_id,
        review_period_id=data.review_period_id,
        parent_id=data.parent_id,
        title=data.title,
        description=data.description,
        category=data.category,
        weight=data.weight,
        status="draft",
    )
    db.add(obj)
    await db.flush()

    for kr_data in data.key_results:
        kr = KeyResult(objective_id=obj.id, **kr_data.model_dump())
        db.add(kr)

    await db.commit()
    result = await db.execute(
        select(Objective).where(Objective.id == obj.id).options(selectinload(Objective.key_results))
    )
    return result.scalar_one()


@router.get("/objectives/{objective_id}", response_model=ObjectiveResponse)
async def get_objective(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Objective).where(Objective.id == objective_id, Objective.workspace_id == workspace_id).options(selectinload(Objective.key_results))
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    return obj


@router.put("/objectives/{objective_id}", response_model=ObjectiveResponse)
async def update_objective(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    data: ObjectiveUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Objective).where(Objective.id == objective_id, Objective.workspace_id == workspace_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    await db.commit()
    result = await db.execute(
        select(Objective).where(Objective.id == objective_id).options(selectinload(Objective.key_results))
    )
    return result.scalar_one()


@router.delete("/objectives/{objective_id}", status_code=204)
async def delete_objective(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Objective).where(Objective.id == objective_id, Objective.workspace_id == workspace_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    await db.delete(obj)
    await db.commit()


# --- Key Results ---

@router.post("/objectives/{objective_id}/key-results", response_model=KeyResultResponse, status_code=201)
async def add_key_result(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    data: KeyResultCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    kr = KeyResult(objective_id=objective_id, **data.model_dump())
    db.add(kr)
    await db.commit()
    await db.refresh(kr)
    return kr


@router.put("/objectives/{objective_id}/key-results/{kr_id}", response_model=KeyResultResponse)
async def update_key_result(
    workspace_id: uuid.UUID,
    objective_id: uuid.UUID,
    kr_id: uuid.UUID,
    data: KeyResultUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KeyResult).join(Objective).where(KeyResult.id == kr_id, Objective.workspace_id == workspace_id)
    )
    kr = result.scalar_one_or_none()
    if not kr:
        raise HTTPException(status_code=404, detail="Key result not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(kr, field, value)
    await db.commit()
    await db.refresh(kr)
    return kr
