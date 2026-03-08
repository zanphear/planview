import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SharedTimelineCreate(BaseModel):
    name: str
    team_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    expires_in_days: int = 30


class SharedTimelineResponse(BaseModel):
    id: uuid.UUID
    token: str
    name: str
    is_active: bool
    team_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    workspace_id: uuid.UUID
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
