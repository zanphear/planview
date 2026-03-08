import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.compliance import ComplianceItem
from app.models.user import User
from app.schemas.compliance import ComplianceItemCreate, ComplianceItemUpdate, ComplianceItemResponse
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/compliance", tags=["compliance"])


@router.get("", response_model=list[ComplianceItemResponse])
async def list_compliance_items(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    item_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ComplianceItem).where(ComplianceItem.workspace_id == workspace_id).order_by(ComplianceItem.expiry_date)
    if user_id:
        query = query.where(ComplianceItem.user_id == user_id)
    if item_type:
        query = query.where(ComplianceItem.item_type == item_type)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=ComplianceItemResponse, status_code=201)
async def create_compliance_item(
    workspace_id: uuid.UUID,
    data: ComplianceItemCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    item = ComplianceItem(workspace_id=workspace_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ComplianceItemResponse)
async def get_compliance_item(
    workspace_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ComplianceItem).where(ComplianceItem.id == item_id, ComplianceItem.workspace_id == workspace_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    return item


@router.put("/{item_id}", response_model=ComplianceItemResponse)
async def update_compliance_item(
    workspace_id: uuid.UUID,
    item_id: uuid.UUID,
    data: ComplianceItemUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ComplianceItem).where(ComplianceItem.id == item_id, ComplianceItem.workspace_id == workspace_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_compliance_item(
    workspace_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ComplianceItem).where(ComplianceItem.id == item_id, ComplianceItem.workspace_id == workspace_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    await db.delete(item)
    await db.commit()
