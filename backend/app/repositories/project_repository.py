"""Project aggregate repository (ADR 0005).

All DB access for the project aggregate lives here. Inherits the
workspace-scoped `get`/`list`/`add`/`delete` from `WorkspaceRepository` and adds
the project-specific queries the service needs: workspace-ordered listing plus
the nested segment and tag reads/writes (both scoped by `project_id`).
"""

import uuid

from sqlalchemy import select

from app.models.project import Project
from app.models.segment import Segment
from app.models.tag import Tag
from app.repositories.base import WorkspaceRepository


class ProjectRepository(WorkspaceRepository[Project]):
    """Workspace-scoped data access for the Project aggregate."""

    model = Project

    async def list_for_workspace(self, workspace_id: uuid.UUID) -> list[Project]:
        """List all projects in a workspace, ordered by name."""
        result = await self.db.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.name)
        )
        return list(result.scalars().all())

    # --- Segments (scoped by project_id) ---

    async def list_segments(self, project_id: uuid.UUID) -> list[Segment]:
        result = await self.db.execute(
            select(Segment)
            .where(Segment.project_id == project_id)
            .order_by(Segment.sort_order)
        )
        return list(result.scalars().all())

    async def get_segment(
        self, project_id: uuid.UUID, segment_id: uuid.UUID
    ) -> Segment | None:
        result = await self.db.execute(
            select(Segment).where(
                Segment.id == segment_id, Segment.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    def add_segment(self, segment: Segment) -> Segment:
        self.db.add(segment)
        return segment

    async def delete_segment(self, segment: Segment) -> None:
        await self.db.delete(segment)

    # --- Tags (scoped by project_id) ---

    async def list_tags(self, project_id: uuid.UUID) -> list[Tag]:
        result = await self.db.execute(
            select(Tag).where(Tag.project_id == project_id).order_by(Tag.name)
        )
        return list(result.scalars().all())

    async def get_tag(
        self, project_id: uuid.UUID, tag_id: uuid.UUID
    ) -> Tag | None:
        result = await self.db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.project_id == project_id)
        )
        return result.scalar_one_or_none()

    def add_tag(self, tag: Tag) -> Tag:
        self.db.add(tag)
        return tag

    async def delete_tag(self, tag: Tag) -> None:
        await self.db.delete(tag)
