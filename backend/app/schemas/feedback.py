import uuid
from datetime import datetime

from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    type: str
    title: str
    description: str


class FeedbackUpdate(BaseModel):
    status: str | None = None
    resolved_at: datetime | None = None


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    description: str
    status: str
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    model_config = {"from_attributes": True}
