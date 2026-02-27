import uuid
from datetime import datetime

from pydantic import BaseModel


class SegmentCreate(BaseModel):
    name: str
    sort_order: int = 0


class SegmentUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


class SegmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    sort_order: int
    project_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
