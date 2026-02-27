import uuid
from datetime import datetime

from pydantic import BaseModel


class TagCreate(BaseModel):
    name: str
    colour: str = "#8E8E8E"


class TagUpdate(BaseModel):
    name: str | None = None
    colour: str | None = None


class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    colour: str
    project_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
