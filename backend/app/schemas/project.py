import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    colour: str = "#4186E0"
    client_id: uuid.UUID | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    colour: str | None = None
    status: str | None = None
    is_favourite: bool | None = None
    client_id: uuid.UUID | None = None
    custom_statuses: Any | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    colour: str
    status: str
    is_favourite: bool
    custom_statuses: Any | None
    client_id: uuid.UUID | None
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
