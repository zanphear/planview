import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.candidate import Candidate, CandidateEvent
from app.models.user import User
from app.schemas.candidate import (
    CandidateCreate, CandidateUpdate, CandidateResponse,
    CandidateEventCreate, CandidateEventResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateResponse])
async def list_candidates(
    workspace_id: uuid.UUID,
    status: str | None = Query(None),
    position: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Candidate)
        .where(Candidate.workspace_id == workspace_id)
        .options(selectinload(Candidate.events))
        .order_by(Candidate.created_at.desc())
    )
    if status:
        query = query.where(Candidate.status == status)
    if position:
        query = query.where(Candidate.position_applied.ilike(f"%{position}%"))
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    workspace_id: uuid.UUID,
    data: CandidateCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    candidate = Candidate(workspace_id=workspace_id, **data.model_dump())
    db.add(candidate)
    await db.commit()
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate.id).options(selectinload(Candidate.events))
    )
    return result.scalar_one()


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    workspace_id: uuid.UUID,
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.workspace_id == workspace_id).options(selectinload(Candidate.events))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.put("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    workspace_id: uuid.UUID,
    candidate_id: uuid.UUID,
    data: CandidateUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id, Candidate.workspace_id == workspace_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)
    await db.commit()
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id).options(selectinload(Candidate.events))
    )
    return result.scalar_one()


@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(
    workspace_id: uuid.UUID,
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id, Candidate.workspace_id == workspace_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    await db.delete(candidate)
    await db.commit()


# --- Events ---

@router.post("/{candidate_id}/events", response_model=CandidateEventResponse, status_code=201)
async def add_event(
    workspace_id: uuid.UUID,
    candidate_id: uuid.UUID,
    data: CandidateEventCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    event = CandidateEvent(candidate_id=candidate_id, **data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
