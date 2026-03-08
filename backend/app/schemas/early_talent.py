import uuid
from datetime import date, datetime

from pydantic import BaseModel


# --- Programme ---

class EarlyTalentProgrammeCreate(BaseModel):
    name: str
    programme_type: str
    description: str | None = None
    start_date: date
    end_date: date | None = None
    duration_months: int | None = None
    max_cohort_size: int | None = None


class EarlyTalentProgrammeUpdate(BaseModel):
    name: str | None = None
    programme_type: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    duration_months: int | None = None
    status: str | None = None
    max_cohort_size: int | None = None


class EarlyTalentProgrammeResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    programme_type: str
    description: str | None = None
    start_date: date
    end_date: date | None = None
    duration_months: int | None = None
    status: str
    max_cohort_size: int | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Cohort ---

class EarlyTalentCohortCreate(BaseModel):
    name: str
    intake_date: date
    expected_end_date: date | None = None
    notes: str | None = None


class EarlyTalentCohortUpdate(BaseModel):
    name: str | None = None
    intake_date: date | None = None
    expected_end_date: date | None = None
    status: str | None = None
    notes: str | None = None


class EarlyTalentCohortResponse(BaseModel):
    id: uuid.UUID
    programme_id: uuid.UUID
    name: str
    intake_date: date
    expected_end_date: date | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Rotation ---

class EarlyTalentRotationCreate(BaseModel):
    name: str
    department: str | None = None
    duration_weeks: int
    description: str | None = None
    sort_order: int = 0
    required_competencies: dict | None = None


class EarlyTalentRotationUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    duration_weeks: int | None = None
    description: str | None = None
    sort_order: int | None = None
    required_competencies: dict | None = None


class EarlyTalentRotationResponse(BaseModel):
    id: uuid.UUID
    programme_id: uuid.UUID
    name: str
    department: str | None = None
    duration_weeks: int
    description: str | None = None
    sort_order: int
    required_competencies: dict | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Participant ---

class EarlyTalentParticipantCreate(BaseModel):
    programme_id: uuid.UUID
    cohort_id: uuid.UUID | None = None
    user_id: uuid.UUID
    mentor_id: uuid.UUID | None = None
    buddy_id: uuid.UUID | None = None
    development_plan_id: uuid.UUID | None = None
    qualification_target: str | None = None
    university: str | None = None
    qualification_level: str | None = None
    start_date: date | None = None
    expected_end_date: date | None = None
    notes: str | None = None


class EarlyTalentParticipantUpdate(BaseModel):
    cohort_id: uuid.UUID | None = None
    mentor_id: uuid.UUID | None = None
    buddy_id: uuid.UUID | None = None
    development_plan_id: uuid.UUID | None = None
    status: str | None = None
    qualification_target: str | None = None
    university: str | None = None
    qualification_level: str | None = None
    qualification_progress: int | None = None
    start_date: date | None = None
    expected_end_date: date | None = None
    actual_end_date: date | None = None
    notes: str | None = None


class EarlyTalentParticipantResponse(BaseModel):
    id: uuid.UUID
    programme_id: uuid.UUID
    cohort_id: uuid.UUID | None = None
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    mentor_id: uuid.UUID | None = None
    buddy_id: uuid.UUID | None = None
    development_plan_id: uuid.UUID | None = None
    status: str
    qualification_target: str | None = None
    university: str | None = None
    qualification_level: str | None = None
    qualification_progress: int
    start_date: date | None = None
    expected_end_date: date | None = None
    actual_end_date: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Rotation Assignment ---

class EarlyTalentRotationAssignmentCreate(BaseModel):
    rotation_id: uuid.UUID
    supervisor_id: uuid.UUID | None = None
    start_date: date
    end_date: date | None = None


class EarlyTalentRotationAssignmentUpdate(BaseModel):
    supervisor_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    assessment: str | None = None
    rating: int | None = None


class EarlyTalentRotationAssignmentResponse(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    rotation_id: uuid.UUID
    supervisor_id: uuid.UUID | None = None
    start_date: date
    end_date: date | None = None
    status: str
    assessment: str | None = None
    rating: int | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Milestone ---

class EarlyTalentMilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    milestone_type: str
    target_date: date | None = None
    sort_order: int = 0


class EarlyTalentMilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    milestone_type: str | None = None
    target_date: date | None = None
    completed_date: date | None = None
    status: str | None = None
    evidence: str | None = None
    sort_order: int | None = None


class EarlyTalentMilestoneResponse(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    title: str
    description: str | None = None
    milestone_type: str
    target_date: date | None = None
    completed_date: date | None = None
    status: str
    evidence: str | None = None
    sort_order: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Dashboard Stats ---

class EarlyTalentDashboardStats(BaseModel):
    total_programmes: int = 0
    active_programmes: int = 0
    total_participants: int = 0
    active_participants: int = 0
    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    avg_qualification_progress: float = 0.0
    overdue_milestones: int = 0
    cohort_completion_rate: float = 0.0
