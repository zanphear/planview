"""Project aggregate service (ADR 0005).

Holds the business logic for projects and their nested segments and tags:
orchestration and the unit-of-work boundary (commits). It MUST NOT import
FastAPI/Starlette or raise `HTTPException`; instead it raises the local domain
errors defined below, which the router translates into HTTP responses.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.segment import Segment
from app.models.tag import Tag
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.segment import SegmentCreate, SegmentUpdate
from app.schemas.tag import TagCreate, TagUpdate


class ProjectServiceError(Exception):
    """Base class for project domain errors. Carries an HTTP-friendly detail."""

    detail = "Project error"


class ProjectNotFound(ProjectServiceError):
    detail = "Project not found"


class SegmentNotFound(ProjectServiceError):
    detail = "Segment not found"


class TagNotFound(ProjectServiceError):
    detail = "Tag not found"


class ProjectService:
    """Business logic for the Project aggregate."""

    def __init__(self, repo: ProjectRepository, db: AsyncSession) -> None:
        self.repo = repo
        self.db = db

    # --- Projects ---

    async def list_projects(self, workspace_id: uuid.UUID) -> list[Project]:
        return await self.repo.list_for_workspace(workspace_id)

    async def create_project(
        self, workspace_id: uuid.UUID, data: ProjectCreate
    ) -> Project:
        project = Project(
            name=data.name,
            colour=data.colour,
            client_id=data.client_id,
            workspace_id=workspace_id,
        )
        self.repo.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project(
        self, workspace_id: uuid.UUID, project_id: uuid.UUID
    ) -> Project:
        project = await self.repo.get(workspace_id, project_id)
        if not project:
            raise ProjectNotFound()
        return project

    async def update_project(
        self, workspace_id: uuid.UUID, project_id: uuid.UUID, data: ProjectUpdate
    ) -> Project:
        project = await self.get_project(workspace_id, project_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(
        self, workspace_id: uuid.UUID, project_id: uuid.UUID
    ) -> None:
        project = await self.get_project(workspace_id, project_id)
        await self.repo.delete(project)
        await self.db.commit()

    # --- Segments ---

    async def list_segments(self, project_id: uuid.UUID) -> list[Segment]:
        return await self.repo.list_segments(project_id)

    async def create_segment(
        self, project_id: uuid.UUID, data: SegmentCreate
    ) -> Segment:
        segment = Segment(
            name=data.name, sort_order=data.sort_order, project_id=project_id
        )
        self.repo.add_segment(segment)
        await self.db.commit()
        await self.db.refresh(segment)
        return segment

    async def update_segment(
        self, project_id: uuid.UUID, segment_id: uuid.UUID, data: SegmentUpdate
    ) -> Segment:
        segment = await self.repo.get_segment(project_id, segment_id)
        if not segment:
            raise SegmentNotFound()
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(segment, field, value)
        await self.db.commit()
        await self.db.refresh(segment)
        return segment

    async def delete_segment(
        self, project_id: uuid.UUID, segment_id: uuid.UUID
    ) -> None:
        segment = await self.repo.get_segment(project_id, segment_id)
        if not segment:
            raise SegmentNotFound()
        await self.repo.delete_segment(segment)
        await self.db.commit()

    # --- Tags ---

    async def list_tags(self, project_id: uuid.UUID) -> list[Tag]:
        return await self.repo.list_tags(project_id)

    async def create_tag(self, project_id: uuid.UUID, data: TagCreate) -> Tag:
        tag = Tag(name=data.name, colour=data.colour, project_id=project_id)
        self.repo.add_tag(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        return tag

    async def update_tag(
        self, project_id: uuid.UUID, tag_id: uuid.UUID, data: TagUpdate
    ) -> Tag:
        tag = await self.repo.get_tag(project_id, tag_id)
        if not tag:
            raise TagNotFound()
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(tag, field, value)
        await self.db.commit()
        await self.db.refresh(tag)
        return tag

    async def delete_tag(self, project_id: uuid.UUID, tag_id: uuid.UUID) -> None:
        tag = await self.repo.get_tag(project_id, tag_id)
        if not tag:
            raise TagNotFound()
        await self.repo.delete_tag(tag)
        await self.db.commit()
