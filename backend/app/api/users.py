import os
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.utils.auth import get_workspace_user, hash_password

router = APIRouter(prefix="/workspaces/{workspace_id}/members", tags=["members"])


class InviteRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "member"


class InviteResponse(BaseModel):
    user: UserResponse
    temp_password: str


class AddMemberRequest(BaseModel):
    name: str
    colour: str | None = None


@router.get("", response_model=list[UserResponse])
async def list_members(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
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
    current_user: User = Depends(get_workspace_user),
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
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    updates = data.model_dump(exclude_unset=True)

    # Role changes require owner/admin privileges
    if "role" in updates:
        if current_user.role not in ("owner", "admin"):
            raise HTTPException(status_code=403, detail="Only owners and admins can change roles")
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        if updates["role"] == "owner" and current_user.role != "owner":
            raise HTTPException(status_code=403, detail="Only the owner can transfer ownership")
        if user.role == "owner":
            raise HTTPException(status_code=400, detail="Cannot demote the workspace owner")
        if updates["role"] not in ("member", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")

    for field, value in updates.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/invite", response_model=InviteResponse, status_code=201)
async def invite_member(
    workspace_id: uuid.UUID,
    data: InviteRequest,
    current_user: User = Depends(get_workspace_user),
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


@router.post("/add", response_model=UserResponse, status_code=201)
async def add_member(
    workspace_id: uuid.UUID,
    data: AddMemberRequest,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can add members")

    initials = "".join(word[0].upper() for word in data.name.split()[:2]) or data.name[:2].upper()

    user = User(
        name=data.name,
        email=None,
        password_hash=None,
        initials=initials,
        colour=data.colour or "#4186E0",
        role="regular",
        workspace_id=workspace_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/{user_id}/avatar", response_model=UserResponse)
async def upload_avatar(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id and current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Can only update your own avatar")

    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in AVATAR_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only image files are allowed (jpg, png, gif, webp)")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Avatar must be under 5MB")

    avatar_dir = os.path.join(settings.upload_dir, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    # Remove old avatar file if exists
    if user.avatar_url:
        old_filename = os.path.basename(user.avatar_url.rsplit("/", 1)[-1])
        old_path = os.path.realpath(os.path.join(avatar_dir, old_filename))
        if old_path.startswith(os.path.realpath(avatar_dir)) and os.path.exists(old_path):
            os.remove(old_path)

    stored_name = f"{user_id}{ext}"
    file_path = os.path.join(avatar_dir, stored_name)
    with open(file_path, "wb") as f:
        f.write(content)

    user.avatar_url = f"/api/v1/avatars/{stored_name}"
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}/avatar", response_model=UserResponse)
async def delete_avatar(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current_user.id and current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Can only update your own avatar")

    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    if user.avatar_url:
        old_filename = os.path.basename(user.avatar_url.rsplit("/", 1)[-1])
        avatar_dir = os.path.realpath(os.path.join(settings.upload_dir, "avatars"))
        old_path = os.path.realpath(os.path.join(avatar_dir, old_filename))
        if old_path.startswith(avatar_dir) and os.path.exists(old_path):
            os.remove(old_path)
        user.avatar_url = None
        await db.commit()
        await db.refresh(user)

    return user


@router.delete("/{user_id}", status_code=204)
async def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
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
