import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/clients", tags=["clients"])


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.workspace_id == workspace_id).order_by(Client.name)
    )
    return result.scalars().all()


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    workspace_id: uuid.UUID,
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = Client(name=data.name, workspace_id=workspace_id)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    workspace_id: uuid.UUID,
    client_id: uuid.UUID,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.workspace_id == workspace_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    workspace_id: uuid.UUID,
    client_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.workspace_id == workspace_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()
