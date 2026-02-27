import uuid
from datetime import date as DateType
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class TimeOffCreate(BaseModel):
    user_id: uuid.UUID
    date_from: DateType
    date_to: DateType
    reason: str = "Time Off"
    colour: str = "#94A3B8"


class TimeOffUpdate(BaseModel):
    date_from: Optional[DateType] = None
    date_to: Optional[DateType] = None
    reason: Optional[str] = None
    colour: Optional[str] = None


class TimeOffResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    date_from: DateType
    date_to: DateType
    reason: str
    colour: str
    user: Optional[UserResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}
