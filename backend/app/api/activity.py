import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.activity import Activity
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/activity",
    tags=["activity"],
)


class ActivityActorResponse(BaseModel):
    id: uuid.UUID
    name: str
    colour: str
    initials: str | None

    model_config = {"from_attributes": True}


class ActivityResponse(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID | None
    entity_name: str | None
    details: dict | None
    actor: ActivityActorResponse
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ActivityResponse])
async def list_activity(
    workspace_id: uuid.UUID,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Activity)
        .where(Activity.workspace_id == workspace_id)
        .options(selectinload(Activity.actor))
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return result.scalars().all()
