import uuid
from datetime import datetime

from pydantic import BaseModel


class TaskTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    colour: str | None = None
    status: str = "todo"
    time_estimate_minutes: int | None = None
    checklist_items: list[dict] | None = None
    tag_names: list[str] | None = None


class TaskTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    colour: str | None = None
    status: str | None = None
    time_estimate_minutes: int | None = None
    checklist_items: list[dict] | None = None
    tag_names: list[str] | None = None


class TaskTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    colour: str | None
    status: str
    time_estimate_minutes: int | None
    checklist_items: list[dict] | None
    tag_names: list[str] | None
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
