import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/projects/{project_id}/tags",
    tags=["tags"],
)


@router.get("", response_model=list[TagResponse])
async def list_tags(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tag).where(Tag.project_id == project_id).order_by(Tag.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag = Tag(name=data.name, colour=data.colour, project_id=project_id)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag = await db.get(Tag, tag_id)
    if not tag or tag.project_id != project_id:
        raise HTTPException(status_code=404, detail="Tag not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag = await db.get(Tag, tag_id)
    if not tag or tag.project_id != project_id:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
    await db.commit()
