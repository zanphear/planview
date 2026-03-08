import uuid
from datetime import datetime

from pydantic import BaseModel


class OnboardingTemplateItemCreate(BaseModel):
    title: str
    description: str | None = None
    sort_order: int = 0
    default_assignee_role: str | None = None


class OnboardingTemplateItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    sort_order: int
    default_assignee_role: str | None = None
    model_config = {"from_attributes": True}


class OnboardingTemplateCreate(BaseModel):
    name: str
    template_type: str  # onboarding, offboarding
    description: str | None = None
    items: list[OnboardingTemplateItemCreate] = []


class OnboardingTemplateResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    template_type: str
    description: str | None = None
    items: list[OnboardingTemplateItemResponse] = []
    created_at: datetime
    model_config = {"from_attributes": True}


class OnboardingChecklistItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    sort_order: int
    completed: bool
    assigned_to: uuid.UUID | None = None
    model_config = {"from_attributes": True}


class OnboardingChecklistCreate(BaseModel):
    user_id: uuid.UUID
    template_id: uuid.UUID | None = None
    checklist_type: str = "onboarding"


class OnboardingChecklistResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    checklist_type: str
    status: str
    checklist_items: list[OnboardingChecklistItemResponse] = []
    created_at: datetime
    model_config = {"from_attributes": True}
