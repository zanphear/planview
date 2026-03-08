import uuid
from datetime import datetime

from pydantic import BaseModel


class LookupValueCreate(BaseModel):
    value: str
    label: str | None = None
    colour: str | None = None
    display_order: int = 0
    is_active: bool = True


class LookupValueUpdate(BaseModel):
    value: str | None = None
    label: str | None = None
    colour: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class LookupValueResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    category: str
    value: str
    label: str | None = None
    colour: str | None = None
    display_order: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ReorderItem(BaseModel):
    id: uuid.UUID
    display_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]
