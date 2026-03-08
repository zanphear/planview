import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


# --- Career Pathways ---

class CareerPathwayCreate(BaseModel):
    name: str
    description: str | None = None
    levels: list[Any] | None = None


class CareerPathwayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    levels: list[Any] | None = None


class CareerPathwayResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None = None
    levels: list[Any] | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Development Milestones ---

class DevelopmentMilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    target_date: date
    status: str = "pending"
    year: int
    sort_order: int = 0


class DevelopmentMilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    target_date: date | None = None
    completed_date: date | None = None
    status: str | None = None
    year: int | None = None
    sort_order: int | None = None


class DevelopmentMilestoneResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    title: str
    description: str | None = None
    target_date: date
    completed_date: date | None = None
    status: str
    year: int
    sort_order: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Development Checkpoints ---

class DevelopmentCheckpointCreate(BaseModel):
    checkpoint_date: date
    reviewer_id: uuid.UUID | None = None
    notes: str | None = None
    overall_assessment: str
    actions: list[Any] | None = None


class DevelopmentCheckpointUpdate(BaseModel):
    checkpoint_date: date | None = None
    reviewer_id: uuid.UUID | None = None
    notes: str | None = None
    overall_assessment: str | None = None
    actions: list[Any] | None = None


class DevelopmentCheckpointResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    checkpoint_date: date
    reviewer_id: uuid.UUID | None = None
    notes: str | None = None
    overall_assessment: str
    actions: list[Any] | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Development Goals ---

class DevelopmentGoalCreate(BaseModel):
    title: str
    description: str | None = None
    goal_type: str | None = None
    linked_competency_id: uuid.UUID | None = None
    target_date: date | None = None
    cost_estimate: float | None = None
    priority: str | None = None
    year: int | None = None
    linked_objective_id: uuid.UUID | None = None


class DevelopmentGoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    evidence: str | None = None
    cost_estimate: float | None = None
    priority: str | None = None
    progress: int | None = None
    year: int | None = None
    actual_cost: float | None = None
    completed_date: date | None = None


class DevelopmentGoalResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    title: str
    description: str | None = None
    goal_type: str | None = None
    linked_competency_id: uuid.UUID | None = None
    target_date: date | None = None
    status: str
    evidence: str | None = None
    cost_estimate: float | None = None
    priority: str | None = None
    progress: int = 0
    year: int | None = None
    linked_objective_id: uuid.UUID | None = None
    actual_cost: float | None = None
    completed_date: date | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Development Plans ---

class DevelopmentPlanCreate(BaseModel):
    user_id: uuid.UUID
    review_period_id: uuid.UUID | None = None
    career_aspiration: str | None = None
    horizon_years: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    career_pathway_id: uuid.UUID | None = None
    total_budget: float | None = None
    goals: list[DevelopmentGoalCreate] = []
    milestones: list[DevelopmentMilestoneCreate] = []


class DevelopmentPlanUpdate(BaseModel):
    status: str | None = None
    career_aspiration: str | None = None
    horizon_years: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    career_pathway_id: uuid.UUID | None = None
    total_budget: float | None = None
    overall_progress: int | None = None


class DevelopmentPlanResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    review_period_id: uuid.UUID | None = None
    status: str
    career_aspiration: str | None = None
    horizon_years: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    career_pathway_id: uuid.UUID | None = None
    overall_progress: int = 0
    total_budget: float | None = None
    goals: list[DevelopmentGoalResponse] = []
    milestones: list[DevelopmentMilestoneResponse] = []
    checkpoints: list[DevelopmentCheckpointResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
