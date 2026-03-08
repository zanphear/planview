import uuid
from datetime import datetime

from pydantic import BaseModel

DEFAULT_MODULES = {
    "people": True,
    "one_to_ones": True,
    "objectives": True,
    "compliance": True,
    "competencies": True,
    "leave": True,
    "recruitment": False,
    "development": True,
    "reviews": False,
    "ai_assistant": True,
    "wellbeing": False,
    "onboarding": False,
    "reporting": True,
    "guide": True,
    "early_talent": False,
    "burndown": True,
    "rotas": True,
}


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    enabled_modules: dict[str, bool] | None = None


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    enabled_modules: dict[str, bool] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
