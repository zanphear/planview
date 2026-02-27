import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    name: str


class ClientUpdate(BaseModel):
    name: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    name: str
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
