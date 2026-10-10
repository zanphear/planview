"""Team aggregate repository (ADR 0005).

All DB access for teams lives here. Inherits the workspace-scoped
`get`/`list`/`add`/`delete` from `WorkspaceRepository` and adds the
team-specific queries the service needs (workspace-ordered listing and the
user lookup used by membership operations).
"""

import uuid

from sqlalchemy import select

from app.models.team import Team
from app.models.user import User
from app.repositories.base import WorkspaceRepository


class TeamRepository(WorkspaceRepository[Team]):
    """Workspace-scoped data access for the Team aggregate."""

    model = Team

    async def list_for_workspace(self, workspace_id: uuid.UUID) -> list[Team]:
        """List all teams in a workspace.

        Mirrors the base `list` but kept as a named method so the service has a
        single, intention-revealing entry point for the team listing query.
        """
        result = await self.db.execute(
            select(Team).where(Team.workspace_id == workspace_id)
        )
        return list(result.scalars().all())

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        """Look up a user by id (not workspace-scoped, matching prior behaviour)."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
