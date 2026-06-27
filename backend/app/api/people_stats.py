import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.logging_config import get_logger
from app.models.candidate import Candidate
from app.models.competency import Competency, UserCompetency
from app.models.compliance import ComplianceItem
from app.models.development import DevelopmentGoal, DevelopmentMilestone, DevelopmentPlan
from app.models.leave import LeaveAllowance, LeaveRequest
from app.models.meeting import Meeting
from app.models.objective import Objective
from app.models.onboarding import OnboardingChecklist, OnboardingChecklistItem
from app.models.person import PersonProfile
from app.models.review import Review, ReviewCycle
from app.models.user import User
from app.models.early_talent import (
    EarlyTalentMilestone, EarlyTalentParticipant, EarlyTalentProgramme,
)
from app.models.wellbeing import Kudos, PulseResponse, PulseSurvey
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["people-stats"])
log = get_logger("planview.people_stats")


@router.get("/people-stats")
async def get_people_stats(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    month_start = today.replace(day=1)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # --- People ---
    try:
        result = await db.execute(
            select(func.count(PersonProfile.id))
            .where(PersonProfile.workspace_id == workspace_id)
        )
        people_total = result.scalar() or 0

        result = await db.execute(
            select(PersonProfile.department, func.count(PersonProfile.id))
            .where(PersonProfile.workspace_id == workspace_id)
            .where(PersonProfile.department.isnot(None))
            .group_by(PersonProfile.department)
        )
        by_department = {row[0]: row[1] for row in result.all()}
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        people_total = 0
        by_department = {}

    # --- Meetings ---
    try:
        result = await db.execute(
            select(func.count(Meeting.id))
            .where(Meeting.workspace_id == workspace_id)
            .where(Meeting.scheduled_date >= month_start)
        )
        meetings_this_month = result.scalar() or 0

        result = await db.execute(
            select(func.count(Meeting.id))
            .where(Meeting.workspace_id == workspace_id)
            .where(Meeting.status == "completed")
        )
        meetings_completed = result.scalar() or 0

        result = await db.execute(
            select(func.count(Meeting.id))
            .where(Meeting.workspace_id == workspace_id)
            .where(Meeting.status == "scheduled")
            .where(Meeting.scheduled_date >= today)
        )
        meetings_upcoming = result.scalar() or 0

        result = await db.execute(
            select(func.count(Meeting.id))
            .where(Meeting.workspace_id == workspace_id)
        )
        meetings_total = result.scalar() or 0
        completion_rate = round(meetings_completed / meetings_total * 100, 1) if meetings_total > 0 else 0.0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        meetings_this_month = 0
        meetings_completed = 0
        meetings_upcoming = 0
        completion_rate = 0.0

    # --- Objectives ---
    try:
        result = await db.execute(
            select(func.count(Objective.id))
            .where(Objective.workspace_id == workspace_id)
        )
        objectives_total = result.scalar() or 0

        result = await db.execute(
            select(Objective.status, func.count(Objective.id))
            .where(Objective.workspace_id == workspace_id)
            .group_by(Objective.status)
        )
        objectives_by_status = {row[0]: row[1] for row in result.all()}

        result = await db.execute(
            select(func.avg(Objective.progress))
            .where(Objective.workspace_id == workspace_id)
        )
        avg_progress = result.scalar()
        avg_progress = round(float(avg_progress), 1) if avg_progress is not None else 0.0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        objectives_total = 0
        objectives_by_status = {}
        avg_progress = 0.0

    # --- Compliance ---
    try:
        result = await db.execute(
            select(func.count(ComplianceItem.id))
            .where(ComplianceItem.workspace_id == workspace_id)
        )
        compliance_total = result.scalar() or 0

        result = await db.execute(
            select(ComplianceItem.status, func.count(ComplianceItem.id))
            .where(ComplianceItem.workspace_id == workspace_id)
            .group_by(ComplianceItem.status)
        )
        compliance_counts = {row[0]: row[1] for row in result.all()}

        result = await db.execute(
            select(ComplianceItem.item_type, func.count(ComplianceItem.id))
            .where(ComplianceItem.workspace_id == workspace_id)
            .group_by(ComplianceItem.item_type)
        )
        compliance_by_type = {row[0]: row[1] for row in result.all()}
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        compliance_total = 0
        compliance_counts = {}
        compliance_by_type = {}

    # --- Competencies ---
    try:
        result = await db.execute(
            select(func.count(Competency.id))
            .where(Competency.workspace_id == workspace_id)
        )
        total_skills = result.scalar() or 0

        result = await db.execute(
            select(UserCompetency.level, func.count(UserCompetency.id))
            .where(UserCompetency.workspace_id == workspace_id)
            .where(UserCompetency.level.isnot(None))
            .group_by(UserCompetency.level)
        )
        by_level = {row[0]: row[1] for row in result.all()}

        result = await db.execute(
            select(func.count(UserCompetency.id))
            .where(UserCompetency.workspace_id == workspace_id)
        )
        total_assignments = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        total_skills = 0
        by_level = {}
        total_assignments = 0

    # --- Leave ---
    try:
        result = await db.execute(
            select(func.count(LeaveRequest.id))
            .where(LeaveRequest.workspace_id == workspace_id)
            .where(LeaveRequest.status == "pending")
        )
        pending_requests = result.scalar() or 0

        result = await db.execute(
            select(func.count(LeaveRequest.id))
            .where(LeaveRequest.workspace_id == workspace_id)
            .where(LeaveRequest.status == "approved")
            .where(LeaveRequest.start_date >= month_start)
        )
        approved_this_month = result.scalar() or 0

        result = await db.execute(
            select(func.count(LeaveAllowance.id))
            .where(LeaveAllowance.workspace_id == workspace_id)
        )
        total_allowances = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        pending_requests = 0
        approved_this_month = 0
        total_allowances = 0

    # --- Recruitment ---
    try:
        result = await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.workspace_id == workspace_id)
        )
        candidates_total = result.scalar() or 0

        result = await db.execute(
            select(Candidate.status, func.count(Candidate.id))
            .where(Candidate.workspace_id == workspace_id)
            .group_by(Candidate.status)
        )
        candidates_by_stage = {row[0]: row[1] for row in result.all()}

        result = await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.workspace_id == workspace_id)
            .where(Candidate.status.notin_(["hired", "rejected", "withdrawn"]))
        )
        candidates_active = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        candidates_total = 0
        candidates_by_stage = {}
        candidates_active = 0

    # --- Development ---
    try:
        result = await db.execute(
            select(func.count(DevelopmentPlan.id))
            .where(DevelopmentPlan.workspace_id == workspace_id)
        )
        total_plans = result.scalar() or 0

        result = await db.execute(
            select(func.count(DevelopmentPlan.id))
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentPlan.status == "active")
        )
        active_plans = result.scalar() or 0

        result = await db.execute(
            select(func.count(DevelopmentGoal.id))
            .select_from(DevelopmentGoal)
            .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
            .where(DevelopmentPlan.workspace_id == workspace_id)
        )
        total_goals = result.scalar() or 0

        result = await db.execute(
            select(func.count(DevelopmentGoal.id))
            .select_from(DevelopmentGoal)
            .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentGoal.status == "completed")
        )
        completed_goals = result.scalar() or 0

        dev_completion_rate = round(completed_goals / total_goals * 100, 1) if total_goals > 0 else 0.0

        # Milestones overdue
        result = await db.execute(
            select(func.count(DevelopmentMilestone.id))
            .select_from(DevelopmentMilestone)
            .join(DevelopmentPlan, DevelopmentMilestone.plan_id == DevelopmentPlan.id)
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentMilestone.target_date < today)
            .where(DevelopmentMilestone.status.notin_(["completed"]))
        )
        milestones_overdue = result.scalar() or 0

        # Budget totals
        result = await db.execute(
            select(func.sum(DevelopmentPlan.total_budget))
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentPlan.total_budget.isnot(None))
        )
        budget_total = result.scalar() or 0.0

        result = await db.execute(
            select(func.sum(DevelopmentGoal.actual_cost))
            .select_from(DevelopmentGoal)
            .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentGoal.actual_cost.isnot(None))
        )
        budget_spent = result.scalar() or 0.0

        # By horizon breakdown
        result = await db.execute(
            select(DevelopmentPlan.horizon_years, func.count(DevelopmentPlan.id))
            .where(DevelopmentPlan.workspace_id == workspace_id)
            .where(DevelopmentPlan.horizon_years.isnot(None))
            .group_by(DevelopmentPlan.horizon_years)
        )
        by_horizon = {row[0]: row[1] for row in result.all()}
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        total_plans = 0
        active_plans = 0
        total_goals = 0
        completed_goals = 0
        dev_completion_rate = 0.0
        milestones_overdue = 0
        budget_total = 0.0
        budget_spent = 0.0
        by_horizon = {}

    # --- Reviews ---
    try:
        result = await db.execute(
            select(func.count(ReviewCycle.id))
            .where(ReviewCycle.workspace_id == workspace_id)
        )
        total_cycles = result.scalar() or 0

        result = await db.execute(
            select(func.count(Review.id))
            .where(Review.workspace_id == workspace_id)
        )
        total_reviews = result.scalar() or 0

        result = await db.execute(
            select(func.avg(Review.overall_rating))
            .where(Review.workspace_id == workspace_id)
            .where(Review.overall_rating.isnot(None))
        )
        avg_rating = result.scalar()
        avg_rating = round(float(avg_rating), 2) if avg_rating is not None else None

        result = await db.execute(
            select(func.count(Review.id))
            .where(Review.workspace_id == workspace_id)
            .where(Review.status == "finalised")
        )
        reviews_completed = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        total_cycles = 0
        total_reviews = 0
        avg_rating = None
        reviews_completed = 0

    # --- Wellbeing ---
    try:
        # Average morale/workload/support across all responses in this workspace
        result = await db.execute(
            select(
                func.avg(PulseResponse.morale),
                func.avg(PulseResponse.workload),
                func.avg(PulseResponse.support),
            )
            .select_from(PulseResponse)
            .join(PulseSurvey, PulseResponse.survey_id == PulseSurvey.id)
            .where(PulseSurvey.workspace_id == workspace_id)
        )
        row = result.one()
        avg_morale = round(float(row[0]), 2) if row[0] is not None else None
        avg_workload = round(float(row[1]), 2) if row[1] is not None else None
        avg_support = round(float(row[2]), 2) if row[2] is not None else None

        result = await db.execute(
            select(func.count(Kudos.id))
            .where(Kudos.workspace_id == workspace_id)
        )
        total_kudos = result.scalar() or 0

        result = await db.execute(
            select(func.count(Kudos.id))
            .where(Kudos.workspace_id == workspace_id)
            .where(Kudos.created_at >= thirty_days_ago)
        )
        recent_kudos = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        avg_morale = None
        avg_workload = None
        avg_support = None
        total_kudos = 0
        recent_kudos = 0

    # --- Onboarding ---
    try:
        result = await db.execute(
            select(func.count(OnboardingChecklist.id))
            .where(OnboardingChecklist.workspace_id == workspace_id)
            .where(OnboardingChecklist.status == "in_progress")
        )
        active_checklists = result.scalar() or 0

        # Average progress: % of completed items per active checklist
        result = await db.execute(
            select(
                func.avg(
                    case(
                        (OnboardingChecklistItem.completed == True, 1.0),  # noqa: E712
                        else_=0.0,
                    )
                ) * 100
            )
            .select_from(OnboardingChecklistItem)
            .join(OnboardingChecklist, OnboardingChecklistItem.checklist_id == OnboardingChecklist.id)
            .where(OnboardingChecklist.workspace_id == workspace_id)
            .where(OnboardingChecklist.status == "in_progress")
        )
        avg_onboarding_progress = result.scalar()
        avg_onboarding_progress = round(float(avg_onboarding_progress), 1) if avg_onboarding_progress is not None else 0.0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        active_checklists = 0
        avg_onboarding_progress = 0.0

    # --- Early Talent ---
    try:
        result = await db.execute(
            select(func.count(EarlyTalentProgramme.id))
            .where(EarlyTalentProgramme.workspace_id == workspace_id)
            .where(EarlyTalentProgramme.status == "active")
        )
        et_active_programmes = result.scalar() or 0

        result = await db.execute(
            select(func.count(EarlyTalentParticipant.id))
            .where(EarlyTalentParticipant.workspace_id == workspace_id)
        )
        et_total_participants = result.scalar() or 0

        result = await db.execute(
            select(func.count(EarlyTalentParticipant.id))
            .where(EarlyTalentParticipant.workspace_id == workspace_id)
            .where(EarlyTalentParticipant.status == "enrolled")
        )
        et_active_participants = result.scalar() or 0

        result = await db.execute(
            select(func.avg(EarlyTalentParticipant.qualification_progress))
            .where(EarlyTalentParticipant.workspace_id == workspace_id)
        )
        et_avg_qual = result.scalar()
        et_avg_qualification_progress = round(float(et_avg_qual), 1) if et_avg_qual is not None else 0.0

        result = await db.execute(
            select(func.count(EarlyTalentMilestone.id))
            .select_from(EarlyTalentMilestone)
            .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
            .where(EarlyTalentParticipant.workspace_id == workspace_id)
            .where(EarlyTalentMilestone.status != "completed")
            .where(EarlyTalentMilestone.target_date.isnot(None))
            .where(EarlyTalentMilestone.target_date < today)
        )
        et_overdue_milestones = result.scalar() or 0
    except Exception:
        log.warning("people_stats_section_failed", exc_info=True)
        et_active_programmes = 0
        et_total_participants = 0
        et_active_participants = 0
        et_avg_qualification_progress = 0.0
        et_overdue_milestones = 0

    return {
        "people": {
            "total": people_total,
            "by_department": by_department,
        },
        "meetings": {
            "this_month": meetings_this_month,
            "completed": meetings_completed,
            "upcoming": meetings_upcoming,
            "completion_rate": completion_rate,
        },
        "objectives": {
            "total": objectives_total,
            "by_status": objectives_by_status,
            "average_progress": avg_progress,
        },
        "compliance": {
            "valid": compliance_counts.get("active", 0),
            "expiring_soon": compliance_counts.get("expiring_soon", 0),
            "expired": compliance_counts.get("expired", 0),
            "total": compliance_total,
            "by_type": compliance_by_type,
        },
        "competencies": {
            "total_skills": total_skills,
            "by_level": by_level,
            "total_assignments": total_assignments,
        },
        "leave": {
            "pending_requests": pending_requests,
            "approved_this_month": approved_this_month,
            "total_allowances": total_allowances,
        },
        "recruitment": {
            "total": candidates_total,
            "by_stage": candidates_by_stage,
            "active": candidates_active,
        },
        "development": {
            "total_plans": total_plans,
            "active_plans": active_plans,
            "total_goals": total_goals,
            "completed_goals": completed_goals,
            "completion_rate": dev_completion_rate,
            "milestones_overdue": milestones_overdue,
            "budget_total": budget_total,
            "budget_spent": budget_spent,
            "by_horizon": by_horizon,
        },
        "reviews": {
            "total_cycles": total_cycles,
            "total_reviews": total_reviews,
            "avg_rating": avg_rating,
            "completed": reviews_completed,
        },
        "wellbeing": {
            "avg_morale": avg_morale,
            "avg_workload": avg_workload,
            "avg_support": avg_support,
            "total_kudos": total_kudos,
            "recent_kudos": recent_kudos,
        },
        "onboarding": {
            "active_checklists": active_checklists,
            "avg_progress": avg_onboarding_progress,
        },
        "early_talent": {
            "active_programmes": et_active_programmes,
            "total_participants": et_total_participants,
            "active_participants": et_active_participants,
            "avg_qualification_progress": et_avg_qualification_progress,
            "overdue_milestones": et_overdue_milestones,
        },
    }
