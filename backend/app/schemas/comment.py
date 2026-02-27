import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserResponse


class CommentCreate(BaseModel):
    body: str


class CommentUpdate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    id: uuid.UUID
    body: str
    task_id: uuid.UUID
    user_id: uuid.UUID
    user: UserResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
