import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, field_validator


def _empty_to_none(v: Any) -> Any:
    if v == '' or v == []:
        return None
    return v


class CompetencyCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    requires_certification: bool = False
    certification_validity_months: int | None = None
    levels: list[str] | None = None

    _coerce = field_validator('category', 'description', 'certification_validity_months', 'levels', mode='before')(_empty_to_none)


class CompetencyUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    requires_certification: bool | None = None
    certification_validity_months: int | None = None
    levels: list[str] | None = None

    _coerce = field_validator('name', 'category', 'description', 'requires_certification', 'certification_validity_months', 'levels', mode='before')(_empty_to_none)


class CompetencyResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    category: str | None = None
    description: str | None = None
    requires_certification: bool
    certification_validity_months: int | None = None
    levels: list[str] | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class UserCompetencyCreate(BaseModel):
    user_id: uuid.UUID
    competency_id: uuid.UUID
    level: str | None = None
    assessed_date: date | None = None
    expiry_date: date | None = None
    notes: str | None = None


class UserCompetencyUpdate(BaseModel):
    level: str | None = None
    assessed_date: date | None = None
    expiry_date: date | None = None
    notes: str | None = None


class UserCompetencyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    competency_id: uuid.UUID
    workspace_id: uuid.UUID
    level: str | None = None
    assessed_date: date | None = None
    assessed_by: uuid.UUID | None = None
    expiry_date: date | None = None
    notes: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
