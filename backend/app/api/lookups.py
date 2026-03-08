import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lookup import LookupValue
from app.models.user import User
from app.schemas.lookup import (
    LookupValueCreate, LookupValueUpdate, LookupValueResponse, ReorderRequest,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/lookups", tags=["lookups"])

LOOKUP_CATEGORIES = [
    "department", "job_title", "location", "competency_category",
    "leave_type", "compliance_item_type", "candidate_source",
    "event_outcome", "onboarding_assignee_role", "kudos_category",
]


def _validate_category(category: str) -> None:
    if category not in LOOKUP_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")


@router.get("", response_model=dict[str, list[LookupValueResponse]])
async def list_all_lookups(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LookupValue)
        .where(LookupValue.workspace_id == workspace_id)
        .order_by(LookupValue.category, LookupValue.display_order, LookupValue.value)
    )
    values = result.scalars().all()
    grouped: dict[str, list[LookupValueResponse]] = {cat: [] for cat in LOOKUP_CATEGORIES}
    for v in values:
        if v.category in grouped:
            grouped[v.category].append(LookupValueResponse.model_validate(v))
    return grouped


@router.get("/{category}", response_model=list[LookupValueResponse])
async def list_lookup_values(
    workspace_id: uuid.UUID,
    category: str,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_category(category)
    result = await db.execute(
        select(LookupValue)
        .where(LookupValue.workspace_id == workspace_id, LookupValue.category == category)
        .order_by(LookupValue.display_order, LookupValue.value)
    )
    return result.scalars().all()


@router.post("/{category}", response_model=LookupValueResponse, status_code=201)
async def create_lookup_value(
    workspace_id: uuid.UUID,
    category: str,
    data: LookupValueCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_category(category)
    lv = LookupValue(workspace_id=workspace_id, category=category, **data.model_dump())
    db.add(lv)
    await db.commit()
    await db.refresh(lv)
    return lv


@router.put("/{category}/{lookup_id}", response_model=LookupValueResponse)
async def update_lookup_value(
    workspace_id: uuid.UUID,
    category: str,
    lookup_id: uuid.UUID,
    data: LookupValueUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_category(category)
    result = await db.execute(
        select(LookupValue).where(
            LookupValue.id == lookup_id,
            LookupValue.workspace_id == workspace_id,
            LookupValue.category == category,
        )
    )
    lv = result.scalar_one_or_none()
    if not lv:
        raise HTTPException(status_code=404, detail="Lookup value not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lv, field, value)
    await db.commit()
    await db.refresh(lv)
    return lv


@router.delete("/{category}/{lookup_id}", status_code=204)
async def delete_lookup_value(
    workspace_id: uuid.UUID,
    category: str,
    lookup_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_category(category)
    result = await db.execute(
        select(LookupValue).where(
            LookupValue.id == lookup_id,
            LookupValue.workspace_id == workspace_id,
            LookupValue.category == category,
        )
    )
    lv = result.scalar_one_or_none()
    if not lv:
        raise HTTPException(status_code=404, detail="Lookup value not found")
    await db.delete(lv)
    await db.commit()


@router.post("/{category}/reorder", status_code=204)
async def reorder_lookup_values(
    workspace_id: uuid.UUID,
    category: str,
    data: ReorderRequest,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_category(category)
    for item in data.items:
        result = await db.execute(
            select(LookupValue).where(
                LookupValue.id == item.id,
                LookupValue.workspace_id == workspace_id,
                LookupValue.category == category,
            )
        )
        lv = result.scalar_one_or_none()
        if lv:
            lv.display_order = item.display_order
    await db.commit()
