import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.competency import Competency, UserCompetency
from app.models.user import User
from app.schemas.competency import (
    CompetencyCreate, CompetencyUpdate, CompetencyResponse,
    UserCompetencyCreate, UserCompetencyUpdate, UserCompetencyResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/competencies", tags=["competencies"])


@router.get("", response_model=list[CompetencyResponse])
async def list_competencies(
    workspace_id: uuid.UUID,
    category: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Competency).where(Competency.workspace_id == workspace_id).order_by(Competency.name)
    if category:
        query = query.where(Competency.category == category)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=CompetencyResponse, status_code=201)
async def create_competency(
    workspace_id: uuid.UUID,
    data: CompetencyCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    comp = Competency(workspace_id=workspace_id, **data.model_dump())
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.put("/{competency_id}", response_model=CompetencyResponse)
async def update_competency(
    workspace_id: uuid.UUID,
    competency_id: uuid.UUID,
    data: CompetencyUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Competency).where(Competency.id == competency_id, Competency.workspace_id == workspace_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(comp, field, value)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.delete("/{competency_id}", status_code=204)
async def delete_competency(
    workspace_id: uuid.UUID,
    competency_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Competency).where(Competency.id == competency_id, Competency.workspace_id == workspace_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found")
    await db.delete(comp)
    await db.commit()


# --- Skills Matrix (user competencies) ---

@router.get("/matrix", response_model=list[UserCompetencyResponse])
async def get_skills_matrix(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    competency_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(UserCompetency).where(UserCompetency.workspace_id == workspace_id)
    if user_id:
        query = query.where(UserCompetency.user_id == user_id)
    if competency_id:
        query = query.where(UserCompetency.competency_id == competency_id)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("/assess", response_model=UserCompetencyResponse, status_code=201)
async def assess_competency(
    workspace_id: uuid.UUID,
    data: UserCompetencyCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    uc = UserCompetency(
        workspace_id=workspace_id,
        assessed_by=current_user.id,
        **data.model_dump(),
    )
    db.add(uc)
    await db.commit()
    await db.refresh(uc)
    return uc


@router.put("/assess/{uc_id}", response_model=UserCompetencyResponse)
async def update_assessment(
    workspace_id: uuid.UUID,
    uc_id: uuid.UUID,
    data: UserCompetencyUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserCompetency).where(UserCompetency.id == uc_id, UserCompetency.workspace_id == workspace_id))
    uc = result.scalar_one_or_none()
    if not uc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(uc, field, value)
    uc.assessed_by = current_user.id
    await db.commit()
    await db.refresh(uc)
    return uc
