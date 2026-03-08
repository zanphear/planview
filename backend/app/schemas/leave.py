import uuid
from datetime import date, datetime

from pydantic import BaseModel


class LeaveAllowanceCreate(BaseModel):
    user_id: uuid.UUID
    year: int
    entitlement_days: int = 25
    carried_forward: int = 0


class LeaveAllowanceResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    year: int
    entitlement_days: int
    carried_forward: int
    used_days: int
    booked_days: int
    remaining: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    days: int
    notes: str | None = None


class LeaveRequestUpdate(BaseModel):
    leave_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    days: int | None = None
    status: str | None = None
    notes: str | None = None


class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    leave_type: str
    start_date: date
    end_date: date
    days: int
    status: str
    approved_by: uuid.UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
