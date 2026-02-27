import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.rota import Rota, RotaEntry
from app.models.user import User
from app.schemas.rota import (
    RotaCreate,
    RotaEntryCreate,
    RotaEntryResponse,
    RotaEntryUpdate,
    RotaResponse,
    RotaUpdate,
)
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/rotas",
    tags=["rotas"],
)

VALID_TYPES = {"callout", "weekday", "24hour"}


def _rota_query(workspace_id: uuid.UUID):
    return (
        select(Rota)
        .where(Rota.workspace_id == workspace_id)
        .options(selectinload(Rota.entries).selectinload(RotaEntry.user))
    )


@router.get("", response_model=list[RotaResponse])
async def list_rotas(
    workspace_id: uuid.UUID,
    rota_type: str | None = Query(None, description="callout|weekday|24hour"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = _rota_query(workspace_id)
    if rota_type:
        q = q.where(Rota.rota_type == rota_type)
    q = q.order_by(Rota.name)
    result = await db.execute(q)
    return result.scalars().unique().all()


@router.post("", response_model=RotaResponse, status_code=201)
async def create_rota(
    workspace_id: uuid.UUID,
    data: RotaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.rota_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid rota_type. Must be one of: {', '.join(VALID_TYPES)}")

    rota = Rota(
        name=data.name,
        rota_type=data.rota_type,
        start_time=data.start_time,
        end_time=data.end_time,
        include_weekends=data.include_weekends,
        colour=data.colour,
        workspace_id=workspace_id,
    )
    db.add(rota)
    await db.commit()

    result = await db.execute(_rota_query(workspace_id).where(Rota.id == rota.id))
    return result.scalar_one()


@router.get("/{rota_id}", response_model=RotaResponse)
async def get_rota(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(_rota_query(workspace_id).where(Rota.id == rota_id))
    rota = result.scalar_one_or_none()
    if not rota:
        raise HTTPException(status_code=404, detail="Rota not found")
    return rota


@router.put("/{rota_id}", response_model=RotaResponse)
async def update_rota(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    data: RotaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Rota).where(Rota.id == rota_id, Rota.workspace_id == workspace_id)
    )
    rota = result.scalar_one_or_none()
    if not rota:
        raise HTTPException(status_code=404, detail="Rota not found")

    update_data = data.model_dump(exclude_unset=True)
    if "rota_type" in update_data and update_data["rota_type"] not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid rota_type. Must be one of: {', '.join(VALID_TYPES)}")

    for field, value in update_data.items():
        setattr(rota, field, value)

    await db.commit()

    result = await db.execute(_rota_query(workspace_id).where(Rota.id == rota_id))
    return result.scalar_one()


@router.delete("/{rota_id}", status_code=204)
async def delete_rota(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Rota).where(Rota.id == rota_id, Rota.workspace_id == workspace_id)
    )
    rota = result.scalar_one_or_none()
    if not rota:
        raise HTTPException(status_code=404, detail="Rota not found")
    await db.delete(rota)
    await db.commit()


# --- Rota Entries ---

@router.get("/{rota_id}/entries", response_model=list[RotaEntryResponse])
async def list_rota_entries(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    since: str | None = Query(None),
    until: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(RotaEntry)
        .where(RotaEntry.rota_id == rota_id, RotaEntry.workspace_id == workspace_id)
        .options(selectinload(RotaEntry.user))
        .order_by(RotaEntry.date_from)
    )
    if user_id:
        q = q.where(RotaEntry.user_id == user_id)
    if since:
        q = q.where(RotaEntry.date_to >= since)
    if until:
        q = q.where(RotaEntry.date_from <= until)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/{rota_id}/entries", response_model=RotaEntryResponse, status_code=201)
async def create_rota_entry(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    data: RotaEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify rota exists
    rota_result = await db.execute(
        select(Rota).where(Rota.id == rota_id, Rota.workspace_id == workspace_id)
    )
    if not rota_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Rota not found")

    if data.date_from > data.date_to:
        raise HTTPException(status_code=400, detail="date_from must be before date_to")

    entry = RotaEntry(
        rota_id=rota_id,
        user_id=data.user_id,
        workspace_id=workspace_id,
        date_from=data.date_from,
        date_to=data.date_to,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()

    result = await db.execute(
        select(RotaEntry)
        .where(RotaEntry.id == entry.id)
        .options(selectinload(RotaEntry.user))
    )
    return result.scalar_one()


@router.put("/{rota_id}/entries/{entry_id}", response_model=RotaEntryResponse)
async def update_rota_entry(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    entry_id: uuid.UUID,
    data: RotaEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RotaEntry).where(
            RotaEntry.id == entry_id,
            RotaEntry.rota_id == rota_id,
            RotaEntry.workspace_id == workspace_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Rota entry not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)

    await db.commit()

    result = await db.execute(
        select(RotaEntry)
        .where(RotaEntry.id == entry_id)
        .options(selectinload(RotaEntry.user))
    )
    return result.scalar_one()


@router.delete("/{rota_id}/entries/{entry_id}", status_code=204)
async def delete_rota_entry(
    workspace_id: uuid.UUID,
    rota_id: uuid.UUID,
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RotaEntry).where(
            RotaEntry.id == entry_id,
            RotaEntry.rota_id == rota_id,
            RotaEntry.workspace_id == workspace_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Rota entry not found")
    await db.delete(entry)
    await db.commit()
