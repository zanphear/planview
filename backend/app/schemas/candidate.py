import uuid
from datetime import date, datetime

from pydantic import BaseModel


class CandidateCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    position_applied: str | None = None
    source: str | None = None
    applied_date: date | None = None
    notes: str | None = None


class CandidateUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    position_applied: str | None = None
    source: str | None = None
    applied_date: date | None = None
    status: str | None = None
    notes: str | None = None


class CandidateEventCreate(BaseModel):
    event_type: str
    event_date: date | None = None
    interviewer_id: uuid.UUID | None = None
    outcome: str | None = None
    notes: str | None = None
    rejection_reason: str | None = None


class CandidateEventResponse(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    event_type: str
    event_date: date | None = None
    interviewer_id: uuid.UUID | None = None
    outcome: str | None = None
    notes: str | None = None
    rejection_reason: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class CandidateResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    email: str | None = None
    phone: str | None = None
    position_applied: str | None = None
    source: str | None = None
    status: str
    applied_date: date | None = None
    notes: str | None = None
    events: list[CandidateEventResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
