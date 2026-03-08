import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.review import ReviewCycle, Review
from app.models.user import User
from app.schemas.review import (
    ReviewCycleCreate, ReviewCycleUpdate, ReviewCycleResponse,
    ReviewCreate, ReviewUpdate, ReviewResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/reviews", tags=["reviews"])


@router.get("/cycles", response_model=list[ReviewCycleResponse])
async def list_cycles(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReviewCycle).where(ReviewCycle.workspace_id == workspace_id).order_by(ReviewCycle.period_start.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/cycles", response_model=ReviewCycleResponse, status_code=201)
async def create_cycle(
    workspace_id: uuid.UUID,
    data: ReviewCycleCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    cycle = ReviewCycle(workspace_id=workspace_id, **data.model_dump())
    db.add(cycle)
    await db.commit()
    await db.refresh(cycle)
    return cycle


@router.put("/cycles/{cycle_id}", response_model=ReviewCycleResponse)
async def update_cycle(
    workspace_id: uuid.UUID,
    cycle_id: uuid.UUID,
    data: ReviewCycleUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReviewCycle).where(ReviewCycle.id == cycle_id, ReviewCycle.workspace_id == workspace_id))
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(status_code=404, detail="Review cycle not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cycle, field, value)
    await db.commit()
    await db.refresh(cycle)
    return cycle


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    workspace_id: uuid.UUID,
    cycle_id: uuid.UUID | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Review).where(Review.workspace_id == workspace_id)
    if cycle_id:
        query = query.where(Review.cycle_id == cycle_id)
    if user_id:
        query = query.where(Review.user_id == user_id)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    workspace_id: uuid.UUID,
    cycle_id: uuid.UUID = Query(...),
    data: ReviewCreate = ...,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    review = Review(
        workspace_id=workspace_id,
        cycle_id=cycle_id,
        user_id=data.user_id,
        reviewer_id=data.reviewer_id,
        status="not_started",
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    workspace_id: uuid.UUID,
    review_id: uuid.UUID,
    data: ReviewUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id, Review.workspace_id == workspace_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    await db.commit()
    await db.refresh(review)
    return review
