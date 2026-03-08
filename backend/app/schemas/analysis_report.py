import uuid
from datetime import datetime

from pydantic import BaseModel


ANALYSIS_TYPES: dict[str, dict] = {
    "executive_summary": {
        "label": "Executive Summary",
        "description": "Comprehensive overview across all people management areas with key metrics and recommendations.",
        "icon": "LayoutDashboard",
        "modules": [],
    },
    "team_health": {
        "label": "Team Health",
        "description": "Analysis of team composition, meeting cadence, morale indicators, and engagement levels.",
        "icon": "HeartPulse",
        "modules": [],
    },
    "compliance": {
        "label": "Compliance & Risk",
        "description": "Review of compliance items, expiry tracking, overdue certifications, and risk exposure.",
        "icon": "Shield",
        "modules": ["compliance"],
    },
    "skills_gap": {
        "label": "Skills Gap Analysis",
        "description": "Assessment of competency coverage, skill gaps, certification status, and training needs.",
        "icon": "Award",
        "modules": ["competencies"],
    },
    "leave_forecast": {
        "label": "Leave Forecast",
        "description": "Leave utilisation patterns, upcoming absences, allowance tracking, and coverage risks.",
        "icon": "CalendarDays",
        "modules": ["leave"],
    },
    "objectives": {
        "label": "Objectives & OKR Progress",
        "description": "Objectives tracking, key result progress, team alignment, and completion trends.",
        "icon": "Target",
        "modules": ["objectives"],
    },
    "recruitment": {
        "label": "Recruitment Pipeline",
        "description": "Candidate pipeline analysis, stage conversion rates, time-to-hire, and source effectiveness.",
        "icon": "UserPlus",
        "modules": ["recruitment"],
    },
    "development": {
        "label": "Development Plans",
        "description": "Learning and development progress, goal completion rates, investment analysis, and career pathways.",
        "icon": "GraduationCap",
        "modules": ["development"],
    },
    "performance": {
        "label": "Performance Reviews",
        "description": "Review cycle progress, rating distributions, completion rates, and calibration insights.",
        "icon": "ClipboardCheck",
        "modules": ["reviews"],
    },
    "onboarding": {
        "label": "Onboarding Progress",
        "description": "New starter onboarding completion, checklist progress, and time-to-productivity estimates.",
        "icon": "ClipboardList",
        "modules": ["onboarding"],
    },
    "early_talent": {
        "label": "Early Talent Programmes",
        "description": "Graduate and apprentice programme health, cohort progress, rotation feedback, qualification tracking, and mentor engagement.",
        "icon": "UserPlus",
        "modules": ["early_talent"],
    },
}


class AnalysisTypeResponse(BaseModel):
    key: str
    label: str
    description: str
    icon: str


class GenerateReportRequest(BaseModel):
    report_type: str


class AnalysisReportResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    report_type: str
    title: str
    content: str | None = None
    parameters: dict | None = None
    status: str
    generation_time_seconds: float | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AnalysisReportListItem(BaseModel):
    id: uuid.UUID
    report_type: str
    title: str
    status: str
    generation_time_seconds: float | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
