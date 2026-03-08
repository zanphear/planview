import uuid
from datetime import date, datetime

from pydantic import BaseModel


class PulseSurveyCreate(BaseModel):
    title: str
    end_date: date | None = None


class PulseResponseCreate(BaseModel):
    morale: int | None = None
    workload: int | None = None
    support: int | None = None
    comments: str | None = None


class PulseResponseOut(BaseModel):
    id: uuid.UUID
    survey_id: uuid.UUID
    morale: int | None = None
    workload: int | None = None
    support: int | None = None
    comments: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class PulseSurveyResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    status: str
    end_date: date | None = None
    responses: list[PulseResponseOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class KudosCreate(BaseModel):
    to_user_id: uuid.UUID
    message: str


class KudosResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    message: str
    created_at: datetime
    model_config = {"from_attributes": True}
