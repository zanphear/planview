import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.utils.auth import get_current_user, hash_password

router = APIRouter(prefix="/workspaces/{workspace_id}/members", tags=["members"])


class InviteRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "member"


class InviteResponse(BaseModel):
    user: UserResponse
    temp_password: str


@router.get("", response_model=list[UserResponse])
async def list_members(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/invite", response_model=InviteResponse, status_code=201)
async def invite_member(
    workspace_id: uuid.UUID,
    data: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only owners/admins can invite
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    temp_password = secrets.token_urlsafe(12)
    initials = "".join(word[0].upper() for word in data.name.split()[:2]) or data.name[:2].upper()

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(temp_password),
        initials=initials,
        role=data.role,
        workspace_id=workspace_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return InviteResponse(user=UserResponse.model_validate(user), temp_password=temp_password)


@router.delete("/{user_id}", status_code=204)
async def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can remove members")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(user)
    await db.commit()
