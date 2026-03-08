import uuid
from datetime import date, datetime

from pydantic import BaseModel


class MeetingCreate(BaseModel):
    report_id: uuid.UUID
    scheduled_date: date
    notes: str | None = None


class MeetingUpdate(BaseModel):
    scheduled_date: date | None = None
    actual_date: date | None = None
    notes: str | None = None
    mood: str | None = None
    status: str | None = None


class MeetingActionCreate(BaseModel):
    title: str
    owner_id: uuid.UUID | None = None


class MeetingActionUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    owner_id: uuid.UUID | None = None


class MeetingActionResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    title: str
    status: str
    owner_id: uuid.UUID | None = None
    carried_from_id: uuid.UUID | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class MeetingResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    manager_id: uuid.UUID
    report_id: uuid.UUID
    scheduled_date: date
    actual_date: date | None = None
    notes: str | None = None
    mood: str | None = None
    status: str
    actions: list[MeetingActionResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
