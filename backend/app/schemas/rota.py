import uuid
from datetime import date as DateType
from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class RotaCreate(BaseModel):
    name: str
    rota_type: str = "callout"  # callout | weekday | 24hour
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    include_weekends: bool = False
    colour: str = "#8A00E5"


class RotaUpdate(BaseModel):
    name: Optional[str] = None
    rota_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    include_weekends: Optional[bool] = None
    colour: Optional[str] = None


class RotaEntryCreate(BaseModel):
    user_id: uuid.UUID
    date_from: DateType
    date_to: DateType
    notes: Optional[str] = None


class RotaEntryUpdate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    date_from: Optional[DateType] = None
    date_to: Optional[DateType] = None
    notes: Optional[str] = None


class RotaEntryResponse(BaseModel):
    id: uuid.UUID
    rota_id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    date_from: DateType
    date_to: DateType
    notes: Optional[str] = None
    user: Optional[UserResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RotaResponse(BaseModel):
    id: uuid.UUID
    name: str
    rota_type: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    include_weekends: bool
    colour: str
    workspace_id: uuid.UUID
    entries: list[RotaEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
