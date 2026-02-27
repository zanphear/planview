import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.team import Team, team_members
from app.models.user import User
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamResponse, TeamUpdate
from app.schemas.user import UserResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/teams", tags=["teams"])


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    workspace_id: uuid.UUID,
    data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = Team(name=data.name, workspace_id=workspace_id)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.workspace_id == workspace_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.workspace_id == workspace_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(team, field, value)

    await db.commit()
    await db.refresh(team)
    return team


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.workspace_id == workspace_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db.delete(team)
    await db.commit()


@router.post("/{team_id}/members", response_model=TeamResponse)
async def add_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamMemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.workspace_id == workspace_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user_result = await db.execute(select(User).where(User.id == data.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user not in team.members:
        team.members.append(user)
        await db.commit()
        await db.refresh(team)

    return team


@router.delete("/{team_id}/members/{user_id}", status_code=204)
async def remove_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.workspace_id == workspace_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user and user in team.members:
        team.members.remove(user)
        await db.commit()
