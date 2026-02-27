import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.custom_field import CustomField, CustomFieldValue
from app.models.user import User
from app.schemas.custom_field import (
    CustomFieldCreate,
    CustomFieldResponse,
    CustomFieldUpdate,
    CustomFieldValueResponse,
    CustomFieldValueSet,
)
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/custom-fields",
    tags=["custom-fields"],
)


@router.get("", response_model=list[CustomFieldResponse])
async def list_custom_fields(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomField)
        .where(CustomField.workspace_id == workspace_id)
        .order_by(CustomField.sort_order)
    )
    return result.scalars().all()


@router.post("", response_model=CustomFieldResponse, status_code=201)
async def create_custom_field(
    workspace_id: uuid.UUID,
    data: CustomFieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    field = CustomField(
        name=data.name,
        field_type=data.field_type,
        options=data.options,
        sort_order=data.sort_order,
        workspace_id=workspace_id,
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return field


@router.put("/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    workspace_id: uuid.UUID,
    field_id: uuid.UUID,
    data: CustomFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomField).where(
            CustomField.id == field_id,
            CustomField.workspace_id == workspace_id,
        )
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(field, k, v)
    await db.commit()
    await db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=204)
async def delete_custom_field(
    workspace_id: uuid.UUID,
    field_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomField).where(
            CustomField.id == field_id,
            CustomField.workspace_id == workspace_id,
        )
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    await db.delete(field)
    await db.commit()


# --- Field values on tasks ---


@router.get("/tasks/{task_id}/values", response_model=list[CustomFieldValueResponse])
async def get_task_field_values(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CustomFieldValue).where(CustomFieldValue.task_id == task_id)
    )
    return result.scalars().all()


@router.put("/tasks/{task_id}/values", response_model=list[CustomFieldValueResponse])
async def set_task_field_values(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    data: list[CustomFieldValueSet],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for item in data:
        existing = await db.execute(
            select(CustomFieldValue).where(
                CustomFieldValue.field_id == item.field_id,
                CustomFieldValue.task_id == task_id,
            )
        )
        val = existing.scalar_one_or_none()
        if val:
            val.value = item.value
        else:
            val = CustomFieldValue(
                field_id=item.field_id,
                task_id=task_id,
                value=item.value,
            )
            db.add(val)
    await db.commit()

    result = await db.execute(
        select(CustomFieldValue).where(CustomFieldValue.task_id == task_id)
    )
    return result.scalars().all()
