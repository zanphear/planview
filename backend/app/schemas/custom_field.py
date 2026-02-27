import uuid
from datetime import datetime

from pydantic import BaseModel


class CustomFieldCreate(BaseModel):
    name: str
    field_type: str = "text"
    options: str | None = None
    sort_order: int = 0


class CustomFieldUpdate(BaseModel):
    name: str | None = None
    field_type: str | None = None
    options: str | None = None
    sort_order: int | None = None


class CustomFieldResponse(BaseModel):
    id: uuid.UUID
    name: str
    field_type: str
    options: str | None
    sort_order: int
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomFieldValueSet(BaseModel):
    field_id: uuid.UUID
    value: str | None = None


class CustomFieldValueResponse(BaseModel):
    id: uuid.UUID
    field_id: uuid.UUID
    task_id: uuid.UUID
    value: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
