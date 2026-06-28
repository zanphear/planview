import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.segment import SegmentCreate, SegmentResponse, SegmentUpdate
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.services.project_service import (
    ProjectNotFound,
    ProjectService,
    SegmentNotFound,
    TagNotFound,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/projects", tags=["projects"])


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(ProjectRepository(db), db)


def _not_found(
    exc: ProjectNotFound | SegmentNotFound | TagNotFound,
) -> HTTPException:
    return HTTPException(status_code=404, detail=exc.detail)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.list_projects(workspace_id)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    workspace_id: uuid.UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.create_project(workspace_id, data)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.get_project(workspace_id, project_id)
    except ProjectNotFound as exc:
        raise _not_found(exc)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.update_project(workspace_id, project_id, data)
    except ProjectNotFound as exc:
        raise _not_found(exc)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        await service.delete_project(workspace_id, project_id)
    except ProjectNotFound as exc:
        raise _not_found(exc)


# --- Segments ---

@router.get("/{project_id}/segments", response_model=list[SegmentResponse])
async def list_segments(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.list_segments(project_id)


@router.post("/{project_id}/segments", response_model=SegmentResponse, status_code=201)
async def create_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: SegmentCreate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.create_segment(project_id, data)


@router.put("/{project_id}/segments/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    data: SegmentUpdate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.update_segment(project_id, segment_id, data)
    except SegmentNotFound as exc:
        raise _not_found(exc)


@router.delete("/{project_id}/segments/{segment_id}", status_code=204)
async def delete_segment(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    segment_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        await service.delete_segment(project_id, segment_id)
    except SegmentNotFound as exc:
        raise _not_found(exc)


# --- Tags ---

@router.get("/{project_id}/tags", response_model=list[TagResponse])
async def list_tags(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.list_tags(project_id)


@router.post("/{project_id}/tags", response_model=TagResponse, status_code=201)
async def create_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    data: TagCreate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    return await service.create_tag(project_id, data)


@router.put("/{project_id}/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    data: TagUpdate,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.update_tag(project_id, tag_id, data)
    except TagNotFound as exc:
        raise _not_found(exc)


@router.delete("/{project_id}/tags/{tag_id}", status_code=204)
async def delete_tag(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: ProjectService = Depends(get_project_service),
):
    try:
        await service.delete_tag(project_id, tag_id)
    except TagNotFound as exc:
        raise _not_found(exc)
