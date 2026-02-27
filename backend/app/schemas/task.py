import uuid
from datetime import date, datetime, time

from pydantic import BaseModel

from app.schemas.user import UserResponse


class TaskCreate(BaseModel):
    name: str
    description: str | None = None
    colour: str | None = None
    status: str = "todo"
    status_emoji: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    time_estimate_minutes: int | None = None
    time_estimate_mode: str = "total"
    project_id: uuid.UUID | None = None
    segment_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    is_recurring: bool = False
    recurrence_rule: str | None = None
    assignee_ids: list[uuid.UUID] = []
    tag_ids: list[uuid.UUID] = []


class TaskUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    colour: str | None = None
    status: str | None = None
    status_emoji: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    time_estimate_minutes: int | None = None
    time_estimate_mode: str | None = None
    project_id: uuid.UUID | None = None
    segment_id: uuid.UUID | None = None
    sort_order: int | None = None
    parent_id: uuid.UUID | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
    assignee_ids: list[uuid.UUID] | None = None
    tag_ids: list[uuid.UUID] | None = None


class ChecklistCreate(BaseModel):
    title: str


class ChecklistUpdate(BaseModel):
    title: str | None = None
    is_completed: bool | None = None
    sort_order: int | None = None


class ChecklistResponse(BaseModel):
    id: uuid.UUID
    title: str
    is_completed: bool
    sort_order: int
    task_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TagBrief(BaseModel):
    id: uuid.UUID
    name: str
    colour: str

    model_config = {"from_attributes": True}


class ProjectBrief(BaseModel):
    id: uuid.UUID
    name: str
    colour: str

    model_config = {"from_attributes": True}


class SubtaskBrief(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    sort_order: int

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    colour: str | None
    status: str
    status_emoji: str | None
    date_from: date | None
    date_to: date | None
    start_time: time | None
    end_time: time | None
    time_estimate_minutes: int | None
    time_estimate_mode: str
    is_recurring: bool
    recurrence_rule: str | None
    sort_order: int
    project_id: uuid.UUID | None
    segment_id: uuid.UUID | None
    parent_id: uuid.UUID | None = None
    workspace_id: uuid.UUID
    assignees: list[UserResponse] = []
    tags: list[TagBrief] = []
    checklists: list[ChecklistResponse] = []
    subtasks: list[SubtaskBrief] = []
    project: ProjectBrief | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
