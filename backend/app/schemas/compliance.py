import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ComplianceItemCreate(BaseModel):
    user_id: uuid.UUID
    item_type: str
    title: str
    reference_number: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    alert_days: list[int] | None = None
    document_id: uuid.UUID | None = None
    notes: str | None = None


class ComplianceItemUpdate(BaseModel):
    item_type: str | None = None
    title: str | None = None
    reference_number: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    status: str | None = None
    alert_days: list[int] | None = None
    document_id: uuid.UUID | None = None
    notes: str | None = None


class ComplianceItemResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    item_type: str
    title: str
    reference_number: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    status: str
    alert_days: list[int] | None = None
    document_id: uuid.UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
