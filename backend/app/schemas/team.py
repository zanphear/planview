import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserResponse


class TeamCreate(BaseModel):
    name: str


class TeamUpdate(BaseModel):
    name: str | None = None
    is_favourite: bool | None = None


class TeamMemberAdd(BaseModel):
    user_id: uuid.UUID


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    is_favourite: bool
    workspace_id: uuid.UUID
    members: list[UserResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
