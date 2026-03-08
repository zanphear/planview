import uuid
from datetime import date, datetime

from pydantic import BaseModel


class PersonProfileCreate(BaseModel):
    job_title: str | None = None
    department: str | None = None
    manager_id: uuid.UUID | None = None
    contract_type: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    location: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    notes: str | None = None


class PersonProfileUpdate(BaseModel):
    job_title: str | None = None
    department: str | None = None
    manager_id: uuid.UUID | None = None
    contract_type: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    location: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    notes: str | None = None


class PersonInsightsUpdate(BaseModel):
    date_of_birth: date | None = None
    partner_name: str | None = None
    number_of_kids: int | None = None
    kids_details: str | None = None
    interests: str | None = None
    dietary_requirements: str | None = None
    emergency_contact: str | None = None
    personal_notes: str | None = None


class PersonDocumentResponse(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    document_type: str
    filename: str
    file_size: int
    mime_type: str
    expiry_date: date | None = None
    uploaded_by: uuid.UUID
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PersonInsightsResponse(BaseModel):
    date_of_birth: date | None = None
    partner_name: str | None = None
    number_of_kids: int | None = None
    kids_details: str | None = None
    interests: str | None = None
    dietary_requirements: str | None = None
    emergency_contact: str | None = None
    personal_notes: str | None = None

    model_config = {"from_attributes": True}


class PersonProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    job_title: str | None = None
    department: str | None = None
    manager_id: uuid.UUID | None = None
    contract_type: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    probation_end: date | None = None
    location: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    notes: str | None = None
    documents: list[PersonDocumentResponse] = []
    created_at: datetime
    updated_at: datetime

    # User info denormalised for convenience
    user_name: str | None = None
    user_email: str | None = None
    user_initials: str | None = None
    user_colour: str | None = None
    user_avatar_url: str | None = None
    manager_name: str | None = None

    model_config = {"from_attributes": True}


class OrgChartNode(BaseModel):
    user_id: uuid.UUID
    name: str
    job_title: str | None = None
    department: str | None = None
    avatar_url: str | None = None
    initials: str | None = None
    colour: str
    children: list["OrgChartNode"] = []

    model_config = {"from_attributes": True}
