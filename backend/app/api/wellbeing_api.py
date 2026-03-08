import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.wellbeing import PulseSurvey, PulseResponse, Kudos
from app.models.user import User
from app.schemas.wellbeing import (
    PulseSurveyCreate, PulseSurveyResponse,
    PulseResponseCreate, PulseResponseOut,
    KudosCreate, KudosResponse,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/wellbeing", tags=["wellbeing"])


# --- Pulse Surveys ---

@router.get("/surveys", response_model=list[PulseSurveyResponse])
async def list_surveys(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PulseSurvey)
        .where(PulseSurvey.workspace_id == workspace_id)
        .options(selectinload(PulseSurvey.responses))
        .order_by(PulseSurvey.created_at.desc())
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/surveys", response_model=PulseSurveyResponse, status_code=201)
async def create_survey(
    workspace_id: uuid.UUID,
    data: PulseSurveyCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    survey = PulseSurvey(workspace_id=workspace_id, **data.model_dump())
    db.add(survey)
    await db.commit()
    result = await db.execute(
        select(PulseSurvey).where(PulseSurvey.id == survey.id).options(selectinload(PulseSurvey.responses))
    )
    return result.scalar_one()


@router.post("/surveys/{survey_id}/respond", response_model=PulseResponseOut, status_code=201)
async def submit_response(
    workspace_id: uuid.UUID,
    survey_id: uuid.UUID,
    data: PulseResponseCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    response = PulseResponse(survey_id=survey_id, user_id=current_user.id, **data.model_dump())
    db.add(response)
    await db.commit()
    await db.refresh(response)
    return response


# --- Kudos ---

@router.get("/kudos", response_model=list[KudosResponse])
async def list_kudos(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Kudos).where(Kudos.workspace_id == workspace_id).order_by(Kudos.created_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.post("/kudos", response_model=KudosResponse, status_code=201)
async def give_kudos(
    workspace_id: uuid.UUID,
    data: KudosCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    kudos = Kudos(workspace_id=workspace_id, from_user_id=current_user.id, **data.model_dump())
    db.add(kudos)
    await db.commit()
    await db.refresh(kudos)
    return kudos
