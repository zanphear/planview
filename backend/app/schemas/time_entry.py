import uuid
from datetime import datetime

from pydantic import BaseModel


class TimeEntryCreate(BaseModel):
    minutes: int
    description: str | None = None
    logged_at: datetime | None = None


class TimeEntryResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    minutes: int
    description: str | None = None
    logged_at: datetime
    created_at: datetime
    user_name: str | None = None
    task_name: str | None = None
    model_config = {"from_attributes": True}
