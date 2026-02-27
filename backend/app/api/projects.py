import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.project import Project
from app.models.segment import Segment
from app.models.tag import Tag
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.segment import SegmentCreate, SegmentResponse, SegmentUpdate
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.workspace_id == workspace_id)
        .order_by(Project.name)
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    workspace_id: uuid.UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        name=data.name,
        colour=data.colour,
        client_id=data.client_id,
        workspace_id=workspace_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()


# --- Segments ---

@router.get("/{project_id}/segments", response_model=list[SegmentResponse])
async def list_segments(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Segment).where(Segment.project_id == project_id).order_by(Segment.sort_order)
    )
    return result.scalars().all()


@router.post("/{project_id}/segments", response_model=SegmentResponse, status_code=201)
async def create_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: SegmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    segment = Segment(name=data.name, sort_order=data.sort_order, project_id=project_id)
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return segment


@router.put("/{project_id}/segments/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    data: SegmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Segment).where(Segment.id == segment_id, Segment.project_id == project_id)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(segment, field, value)

    await db.commit()
    await db.refresh(segment)
    return segment


@router.delete("/{project_id}/segments/{segment_id}", status_code=204)
async def delete_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Segment).where(Segment.id == segment_id, Segment.project_id == project_id)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    await db.delete(segment)
    await db.commit()


# --- Tags ---

@router.get("/{project_id}/tags", response_model=list[TagResponse])
async def list_tags(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.project_id == project_id).order_by(Tag.name)
    )
    return result.scalars().all()


@router.post("/{project_id}/tags", response_model=TagResponse, status_code=201)
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


@router.put("/{project_id}/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.project_id == project_id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)

    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{project_id}/tags/{tag_id}", status_code=204)
async def delete_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.project_id == project_id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.commit()
