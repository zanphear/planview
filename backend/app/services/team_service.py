"""Team aggregate service (ADR 0005).

Holds the business logic for teams: orchestration, membership rules, and the
unit-of-work boundary (commits). It MUST NOT import FastAPI/Starlette or raise
`HTTPException`; instead it raises the local domain errors defined below, which
the router translates into HTTP responses.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.team import Team
from app.repositories.team_repository import TeamRepository
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamUpdate


class TeamServiceError(Exception):
    """Base class for team domain errors. Carries an HTTP-friendly detail."""

    detail = "Team error"


class TeamNotFound(TeamServiceError):
    detail = "Team not found"


class TeamMemberUserNotFound(TeamServiceError):
    detail = "User not found"


class TeamConflict(TeamServiceError):
    detail = "Team conflict"


class TeamService:
    """Business logic for the Team aggregate."""

    def __init__(self, repo: TeamRepository, db: AsyncSession) -> None:
        self.repo = repo
        self.db = db

    async def list_teams(self, workspace_id: uuid.UUID) -> list[Team]:
        return await self.repo.list_for_workspace(workspace_id)

    async def create_team(
        self, workspace_id: uuid.UUID, data: TeamCreate
    ) -> Team:
        team = Team(name=data.name, workspace_id=workspace_id)
        self.repo.add(team)
        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def get_team(
        self, workspace_id: uuid.UUID, team_id: uuid.UUID
    ) -> Team:
        team = await self.repo.get(workspace_id, team_id)
        if not team:
            raise TeamNotFound()
        return team

    async def update_team(
        self, workspace_id: uuid.UUID, team_id: uuid.UUID, data: TeamUpdate
    ) -> Team:
        team = await self.get_team(workspace_id, team_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(team, field, value)
        await self.db.commit()
        await self.db.refresh(team)
        return team

    async def delete_team(
        self, workspace_id: uuid.UUID, team_id: uuid.UUID
    ) -> None:
        team = await self.get_team(workspace_id, team_id)
        await self.repo.delete(team)
        await self.db.commit()

    async def add_member(
        self, workspace_id: uuid.UUID, team_id: uuid.UUID, data: TeamMemberAdd
    ) -> Team:
        team = await self.get_team(workspace_id, team_id)
        user = await self.repo.get_user(data.user_id)
        if not user:
            raise TeamMemberUserNotFound()
        if user not in team.members:
            team.members.append(user)
            await self.db.commit()
            await self.db.refresh(team)
        return team

    async def remove_member(
        self, workspace_id: uuid.UUID, team_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        team = await self.get_team(workspace_id, team_id)
        user = await self.repo.get_user(user_id)
        if user and user in team.members:
            team.members.remove(user)
            await self.db.commit()
