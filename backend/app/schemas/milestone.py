import uuid
from datetime import date as DateType
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MilestoneCreate(BaseModel):
    name: str
    date: DateType
    colour: str = "#E44332"
    project_id: Optional[uuid.UUID] = None


class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[DateType] = None
    colour: Optional[str] = None
    project_id: Optional[uuid.UUID] = None


class MilestoneResponse(BaseModel):
    id: uuid.UUID
    name: str
    date: DateType
    colour: str
    project_id: Optional[uuid.UUID]
    workspace_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
