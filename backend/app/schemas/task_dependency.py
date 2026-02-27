import uuid
from datetime import datetime

from pydantic import BaseModel


class DependencyCreate(BaseModel):
    blocker_id: uuid.UUID
    blocked_id: uuid.UUID
    dependency_type: str = "finish_to_start"


class DependencyResponse(BaseModel):
    id: uuid.UUID
    blocker_id: uuid.UUID
    blocked_id: uuid.UUID
    dependency_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
