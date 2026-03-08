import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ReviewPeriodCreate(BaseModel):
    name: str
    start_date: date
    end_date: date


class ReviewPeriodResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    created_at: datetime
    model_config = {"from_attributes": True}


class KeyResultCreate(BaseModel):
    title: str
    description: str | None = None
    target_value: float | None = None
    unit: str | None = None
    measurement_type: str = "numeric"


class KeyResultUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    current_value: float | None = None
    target_value: float | None = None
    unit: str | None = None
    measurement_type: str | None = None


class KeyResultResponse(BaseModel):
    id: uuid.UUID
    objective_id: uuid.UUID
    title: str
    description: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    unit: str | None = None
    measurement_type: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ObjectiveCreate(BaseModel):
    user_id: uuid.UUID
    review_period_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    category: str | None = None
    weight: float | None = None
    key_results: list[KeyResultCreate] = []


class ObjectiveUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    status: str | None = None
    progress: int | None = None
    weight: float | None = None
    review_period_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None


class ObjectiveResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    review_period_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    category: str | None = None
    status: str
    progress: int
    weight: float | None = None
    key_results: list[KeyResultResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
