import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.repositories.team_repository import TeamRepository
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamResponse, TeamUpdate
from app.services.team_service import (
    TeamConflict,
    TeamMemberUserNotFound,
    TeamNotFound,
    TeamService,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/teams", tags=["teams"])


def get_team_service(db: AsyncSession = Depends(get_db)) -> TeamService:
    return TeamService(TeamRepository(db), db)


def _not_found(exc: TeamNotFound | TeamMemberUserNotFound) -> HTTPException:
    return HTTPException(status_code=404, detail=exc.detail)


def _conflict(exc: TeamConflict) -> HTTPException:
    return HTTPException(status_code=409, detail=exc.detail)


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    return await service.list_teams(workspace_id)


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    workspace_id: uuid.UUID,
    data: TeamCreate,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        return await service.create_team(workspace_id, data)
    except TeamConflict as exc:
        raise _conflict(exc)


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        return await service.get_team(workspace_id, team_id)
    except TeamNotFound as exc:
        raise _not_found(exc)


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamUpdate,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        return await service.update_team(workspace_id, team_id, data)
    except TeamNotFound as exc:
        raise _not_found(exc)
    except TeamConflict as exc:
        raise _conflict(exc)


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        await service.delete_team(workspace_id, team_id)
    except TeamNotFound as exc:
        raise _not_found(exc)


@router.post("/{team_id}/members", response_model=TeamResponse)
async def add_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamMemberAdd,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        return await service.add_member(workspace_id, team_id, data)
    except (TeamNotFound, TeamMemberUserNotFound) as exc:
        raise _not_found(exc)


@router.delete("/{team_id}/members/{user_id}", status_code=204)
async def remove_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    service: TeamService = Depends(get_team_service),
):
    try:
        await service.remove_member(workspace_id, team_id, user_id)
    except TeamNotFound as exc:
        raise _not_found(exc)
