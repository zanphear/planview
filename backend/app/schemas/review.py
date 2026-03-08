import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ReviewCycleCreate(BaseModel):
    name: str
    period_start: date
    period_end: date


class ReviewCycleUpdate(BaseModel):
    name: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    status: str | None = None


class ReviewCycleResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    period_start: date
    period_end: date
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ReviewCreate(BaseModel):
    user_id: uuid.UUID
    reviewer_id: uuid.UUID


class ReviewUpdate(BaseModel):
    reviewer_id: uuid.UUID | None = None
    self_assessment: dict | None = None
    manager_assessment: dict | None = None
    overall_rating: int | None = None
    strengths: str | None = None
    areas_for_improvement: str | None = None
    status: str | None = None


class ReviewResponse(BaseModel):
    id: uuid.UUID
    cycle_id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    reviewer_id: uuid.UUID
    self_assessment: dict | None = None
    manager_assessment: dict | None = None
    overall_rating: int | None = None
    strengths: str | None = None
    areas_for_improvement: str | None = None
    status: str
    sign_off_date: date | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
