import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    workspace_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str | None
    initials: str | None
    colour: str
    avatar_url: str | None
    role: str
    pin_on_top: bool
    notification_prefs: dict | None = None
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    initials: str | None = None
    colour: str | None = None
    avatar_url: str | None = None
    pin_on_top: bool | None = None
    notification_prefs: dict | None = None
    role: str | None = None
