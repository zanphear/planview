import time
import uuid
from datetime import date, datetime, timedelta, timezone

import httpx
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.analysis_report import AnalysisReport
from app.models.candidate import Candidate
from app.models.competency import Competency, UserCompetency
from app.models.compliance import ComplianceItem
from app.models.development import CareerPathway, DevelopmentCheckpoint, DevelopmentGoal, DevelopmentMilestone, DevelopmentPlan
from app.models.leave import LeaveAllowance, LeaveRequest
from app.models.meeting import Meeting, MeetingAction
from app.models.objective import Objective, KeyResult
from app.models.onboarding import OnboardingChecklist, OnboardingChecklistItem
from app.models.person import PersonProfile
from app.models.review import Review, ReviewCycle
from app.models.user import User
from app.models.early_talent import (
    EarlyTalentCohort, EarlyTalentMilestone, EarlyTalentParticipant,
    EarlyTalentProgramme, EarlyTalentRotationAssignment,
)
from app.models.wellbeing import Kudos, PulseResponse, PulseSurvey


async def call_llm(messages: list[dict]) -> str:
    if not settings.ai_model_url:
        raise RuntimeError("AI_MODEL_URL is not configured")

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            settings.ai_chat_url,
            json={
                "model": settings.ai_model_name,
                "messages": messages,
                "stream": False,
                "max_tokens": 4096,
                "temperature": 0.3,
            },
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Context gatherers, each returns a plain-text summary for the LLM
# ---------------------------------------------------------------------------

async def gather_team_health_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Team Health Data\n"]

    # People count + departments
    result = await db.execute(
        select(func.count(PersonProfile.id)).where(PersonProfile.workspace_id == workspace_id)
    )
    total_people = result.scalar() or 0
    lines.append(f"Total people: {total_people}")

    result = await db.execute(
        select(PersonProfile.department, func.count(PersonProfile.id))
        .where(PersonProfile.workspace_id == workspace_id)
        .where(PersonProfile.department.isnot(None))
        .group_by(PersonProfile.department)
    )
    depts = result.all()
    if depts:
        lines.append("By department: " + ", ".join(f"{d[0]}: {d[1]}" for d in depts))

    # Meeting cadence
    today = date.today()
    month_start = today.replace(day=1)
    result = await db.execute(
        select(func.count(Meeting.id))
        .where(Meeting.workspace_id == workspace_id)
        .where(Meeting.scheduled_date >= month_start)
    )
    meetings_month = result.scalar() or 0

    result = await db.execute(
        select(Meeting.status, func.count(Meeting.id))
        .where(Meeting.workspace_id == workspace_id)
        .group_by(Meeting.status)
    )
    meeting_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Meetings this month: {meetings_month}")
    lines.append(f"Meeting status breakdown: {meeting_status}")

    # Open meeting actions
    result = await db.execute(
        select(func.count(MeetingAction.id))
        .select_from(MeetingAction)
        .join(Meeting, MeetingAction.meeting_id == Meeting.id)
        .where(Meeting.workspace_id == workspace_id)
        .where(MeetingAction.status == "open")
    )
    open_actions = result.scalar() or 0
    lines.append(f"Open meeting actions: {open_actions}")

    # Wellbeing pulse averages
    result = await db.execute(
        select(
            func.avg(PulseResponse.morale),
            func.avg(PulseResponse.workload),
            func.avg(PulseResponse.support),
            func.count(PulseResponse.id),
        )
        .select_from(PulseResponse)
        .join(PulseSurvey, PulseResponse.survey_id == PulseSurvey.id)
        .where(PulseSurvey.workspace_id == workspace_id)
    )
    row = result.one()
    if row[3] > 0:
        lines.append(f"Pulse survey responses: {row[3]}")
        lines.append(f"Average morale: {round(float(row[0] or 0), 1)}/5")
        lines.append(f"Average workload: {round(float(row[1] or 0), 1)}/5")
        lines.append(f"Average support: {round(float(row[2] or 0), 1)}/5")

    # Recent kudos
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(func.count(Kudos.id))
        .where(Kudos.workspace_id == workspace_id)
        .where(Kudos.created_at >= thirty_days_ago)
    )
    recent_kudos = result.scalar() or 0
    lines.append(f"Kudos given in last 30 days: {recent_kudos}")

    return "\n".join(lines)


async def gather_compliance_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Compliance Data\n"]

    result = await db.execute(
        select(ComplianceItem.status, func.count(ComplianceItem.id))
        .where(ComplianceItem.workspace_id == workspace_id)
        .group_by(ComplianceItem.status)
    )
    status_counts = {r[0]: r[1] for r in result.all()}
    lines.append(f"Status breakdown: {status_counts}")

    result = await db.execute(
        select(ComplianceItem.item_type, func.count(ComplianceItem.id))
        .where(ComplianceItem.workspace_id == workspace_id)
        .group_by(ComplianceItem.item_type)
    )
    type_counts = {r[0]: r[1] for r in result.all()}
    lines.append(f"By type: {type_counts}")

    # Expiring/expired items with details
    today = date.today()
    ninety_days = today + timedelta(days=90)
    result = await db.execute(
        select(ComplianceItem.title, ComplianceItem.item_type, ComplianceItem.expiry_date, ComplianceItem.status, User.name)
        .join(User, ComplianceItem.user_id == User.id)
        .where(ComplianceItem.workspace_id == workspace_id)
        .where(ComplianceItem.expiry_date.isnot(None))
        .where(ComplianceItem.expiry_date <= ninety_days)
        .order_by(ComplianceItem.expiry_date)
        .limit(50)
    )
    items = result.all()
    if items:
        lines.append("\nItems expiring within 90 days or already expired:")
        for item in items:
            status = "EXPIRED" if item[2] and item[2] < today else "expiring"
            lines.append(f"  - {item[4]}: {item[0]} ({item[1]}), expires {item[2]} [{status}]")

    return "\n".join(lines)


async def gather_skills_gap_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Skills & Competencies Data\n"]

    result = await db.execute(
        select(func.count(Competency.id)).where(Competency.workspace_id == workspace_id)
    )
    total_skills = result.scalar() or 0
    lines.append(f"Total competencies defined: {total_skills}")

    result = await db.execute(
        select(Competency.category, func.count(Competency.id))
        .where(Competency.workspace_id == workspace_id)
        .where(Competency.category.isnot(None))
        .group_by(Competency.category)
    )
    by_cat = {r[0]: r[1] for r in result.all()}
    lines.append(f"By category: {by_cat}")

    result = await db.execute(
        select(UserCompetency.level, func.count(UserCompetency.id))
        .where(UserCompetency.workspace_id == workspace_id)
        .where(UserCompetency.level.isnot(None))
        .group_by(UserCompetency.level)
    )
    by_level = {r[0]: r[1] for r in result.all()}
    lines.append(f"Assignments by level: {by_level}")

    # Competencies with fewest assignments (potential gaps)
    result = await db.execute(
        select(Competency.name, Competency.category, func.count(UserCompetency.id))
        .outerjoin(UserCompetency, Competency.id == UserCompetency.competency_id)
        .where(Competency.workspace_id == workspace_id)
        .group_by(Competency.id, Competency.name, Competency.category)
        .order_by(func.count(UserCompetency.id))
        .limit(20)
    )
    gaps = result.all()
    if gaps:
        lines.append("\nCompetencies by assignment count (lowest first):")
        for g in gaps:
            lines.append(f"  - {g[0]} ({g[1] or 'uncategorised'}): {g[2]} people assigned")

    # Expiring certifications
    today = date.today()
    result = await db.execute(
        select(User.name, Competency.name, UserCompetency.expiry_date)
        .select_from(UserCompetency)
        .join(User, UserCompetency.user_id == User.id)
        .join(Competency, UserCompetency.competency_id == Competency.id)
        .where(UserCompetency.workspace_id == workspace_id)
        .where(UserCompetency.expiry_date.isnot(None))
        .where(UserCompetency.expiry_date <= today + timedelta(days=90))
        .order_by(UserCompetency.expiry_date)
        .limit(30)
    )
    expiring = result.all()
    if expiring:
        lines.append("\nExpiring certifications (next 90 days):")
        for e in expiring:
            lines.append(f"  - {e[0]}: {e[1]}, expires {e[2]}")

    return "\n".join(lines)


async def gather_leave_forecast_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Leave Data\n"]

    result = await db.execute(
        select(LeaveRequest.status, func.count(LeaveRequest.id))
        .where(LeaveRequest.workspace_id == workspace_id)
        .group_by(LeaveRequest.status)
    )
    status_counts = {r[0]: r[1] for r in result.all()}
    lines.append(f"Request status: {status_counts}")

    result = await db.execute(
        select(LeaveRequest.leave_type, func.count(LeaveRequest.id), func.sum(LeaveRequest.days))
        .where(LeaveRequest.workspace_id == workspace_id)
        .group_by(LeaveRequest.leave_type)
    )
    by_type = result.all()
    if by_type:
        lines.append("By type: " + ", ".join(f"{r[0]}: {r[1]} requests ({r[2]} days)" for r in by_type))

    # Upcoming approved leave
    today = date.today()
    result = await db.execute(
        select(User.name, LeaveRequest.leave_type, LeaveRequest.start_date, LeaveRequest.end_date, LeaveRequest.days)
        .join(User, LeaveRequest.user_id == User.id)
        .where(LeaveRequest.workspace_id == workspace_id)
        .where(LeaveRequest.status == "approved")
        .where(LeaveRequest.start_date >= today)
        .order_by(LeaveRequest.start_date)
        .limit(30)
    )
    upcoming = result.all()
    if upcoming:
        lines.append("\nUpcoming approved leave:")
        for u in upcoming:
            lines.append(f"  - {u[0]}: {u[1]} from {u[2]} to {u[3]} ({u[4]} days)")

    # Allowance utilisation
    current_year = today.year
    result = await db.execute(
        select(User.name, LeaveAllowance.entitlement_days, LeaveAllowance.used_days, LeaveAllowance.booked_days, LeaveAllowance.carried_forward)
        .join(User, LeaveAllowance.user_id == User.id)
        .where(LeaveAllowance.workspace_id == workspace_id)
        .where(LeaveAllowance.year == current_year)
        .limit(50)
    )
    allowances = result.all()
    if allowances:
        lines.append(f"\n{current_year} allowance utilisation:")
        for a in allowances:
            total = a[1] + a[4]
            remaining = total - a[2] - a[3]
            lines.append(f"  - {a[0]}: {a[2]} used, {a[3]} booked, {remaining} remaining of {total}")

    return "\n".join(lines)


async def gather_objectives_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Objectives & OKR Data\n"]

    result = await db.execute(
        select(Objective.status, func.count(Objective.id))
        .where(Objective.workspace_id == workspace_id)
        .group_by(Objective.status)
    )
    status_counts = {r[0]: r[1] for r in result.all()}
    lines.append(f"By status: {status_counts}")

    result = await db.execute(
        select(func.avg(Objective.progress)).where(Objective.workspace_id == workspace_id)
    )
    avg_prog = result.scalar()
    lines.append(f"Average progress: {round(float(avg_prog), 1) if avg_prog else 0}%")

    # Objectives with details
    result = await db.execute(
        select(User.name, Objective.title, Objective.status, Objective.progress, Objective.category)
        .join(User, Objective.user_id == User.id)
        .where(Objective.workspace_id == workspace_id)
        .order_by(Objective.progress)
        .limit(50)
    )
    objectives = result.all()
    if objectives:
        lines.append("\nObjectives (sorted by progress, lowest first):")
        for o in objectives:
            lines.append(f"  - {o[0]}: \"{o[1]}\", {o[3]}% [{o[2]}] ({o[4] or 'uncategorised'})")

    # Key results summary
    result = await db.execute(
        select(func.count(KeyResult.id))
        .select_from(KeyResult)
        .join(Objective, KeyResult.objective_id == Objective.id)
        .where(Objective.workspace_id == workspace_id)
    )
    total_krs = result.scalar() or 0
    lines.append(f"\nTotal key results: {total_krs}")

    return "\n".join(lines)


async def gather_recruitment_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Recruitment Data\n"]

    result = await db.execute(
        select(Candidate.status, func.count(Candidate.id))
        .where(Candidate.workspace_id == workspace_id)
        .group_by(Candidate.status)
    )
    by_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Pipeline by status: {by_status}")

    result = await db.execute(
        select(Candidate.source, func.count(Candidate.id))
        .where(Candidate.workspace_id == workspace_id)
        .where(Candidate.source.isnot(None))
        .group_by(Candidate.source)
    )
    by_source = {r[0]: r[1] for r in result.all()}
    lines.append(f"By source: {by_source}")

    # Active candidates with details
    result = await db.execute(
        select(Candidate.name, Candidate.position_applied, Candidate.status, Candidate.source, Candidate.applied_date)
        .where(Candidate.workspace_id == workspace_id)
        .where(Candidate.status.notin_(["hired", "rejected", "withdrawn"]))
        .order_by(Candidate.applied_date.desc())
        .limit(30)
    )
    active = result.all()
    if active:
        lines.append("\nActive candidates:")
        for c in active:
            lines.append(f"  - {c[0]}: applying for {c[1] or 'unspecified'} [{c[2]}] via {c[3] or 'unknown'}, applied {c[4]}")

    # Positions with most candidates
    result = await db.execute(
        select(Candidate.position_applied, func.count(Candidate.id))
        .where(Candidate.workspace_id == workspace_id)
        .where(Candidate.position_applied.isnot(None))
        .group_by(Candidate.position_applied)
        .order_by(func.count(Candidate.id).desc())
        .limit(10)
    )
    positions = result.all()
    if positions:
        lines.append("\nPositions by candidate count:")
        for p in positions:
            lines.append(f"  - {p[0]}: {p[1]} candidates")

    return "\n".join(lines)


async def gather_development_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Development Plans Data\n"]

    result = await db.execute(
        select(DevelopmentPlan.status, func.count(DevelopmentPlan.id))
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .group_by(DevelopmentPlan.status)
    )
    plan_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Plans by status: {plan_status}")

    result = await db.execute(
        select(DevelopmentGoal.status, func.count(DevelopmentGoal.id))
        .select_from(DevelopmentGoal)
        .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .group_by(DevelopmentGoal.status)
    )
    goal_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Goals by status: {goal_status}")

    result = await db.execute(
        select(DevelopmentGoal.goal_type, func.count(DevelopmentGoal.id))
        .select_from(DevelopmentGoal)
        .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentGoal.goal_type.isnot(None))
        .group_by(DevelopmentGoal.goal_type)
    )
    by_type = {r[0]: r[1] for r in result.all()}
    lines.append(f"Goals by type: {by_type}")

    # Plans by horizon_years breakdown
    result = await db.execute(
        select(DevelopmentPlan.horizon_years, func.count(DevelopmentPlan.id))
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentPlan.horizon_years.isnot(None))
        .group_by(DevelopmentPlan.horizon_years)
        .order_by(DevelopmentPlan.horizon_years)
    )
    by_horizon = {r[0]: r[1] for r in result.all()}
    if by_horizon:
        lines.append(f"Plans by horizon (years): {by_horizon}")

    # Individual plans with goals
    result = await db.execute(
        select(User.name, DevelopmentPlan.status, DevelopmentPlan.career_aspiration)
        .join(User, DevelopmentPlan.user_id == User.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentPlan.status == "active")
        .limit(30)
    )
    plans = result.all()
    if plans:
        lines.append("\nActive development plans:")
        for p in plans:
            aspiration = f", aspiration: {p[2][:80]}" if p[2] else ""
            lines.append(f"  - {p[0]} [{p[1]}]{aspiration}")

    # Milestone status counts
    today = date.today()
    result = await db.execute(
        select(DevelopmentMilestone.status, func.count(DevelopmentMilestone.id))
        .select_from(DevelopmentMilestone)
        .join(DevelopmentPlan, DevelopmentMilestone.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .group_by(DevelopmentMilestone.status)
    )
    milestone_status = {r[0]: r[1] for r in result.all()}
    if milestone_status:
        lines.append(f"\nMilestones by status: {milestone_status}")

    # Overdue milestones
    result = await db.execute(
        select(func.count(DevelopmentMilestone.id))
        .select_from(DevelopmentMilestone)
        .join(DevelopmentPlan, DevelopmentMilestone.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentMilestone.target_date < today)
        .where(DevelopmentMilestone.status.notin_(["completed"]))
    )
    overdue_milestones = result.scalar() or 0
    if overdue_milestones:
        lines.append(f"Overdue milestones: {overdue_milestones}")

    # Career pathway usage
    result = await db.execute(
        select(CareerPathway.name, func.count(DevelopmentPlan.id))
        .select_from(DevelopmentPlan)
        .join(CareerPathway, DevelopmentPlan.career_pathway_id == CareerPathway.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .group_by(CareerPathway.name)
    )
    pathway_usage = {r[0]: r[1] for r in result.all()}
    if pathway_usage:
        lines.append(f"Career pathway usage: {pathway_usage}")

    # Checkpoint assessments
    result = await db.execute(
        select(DevelopmentCheckpoint.overall_assessment, func.count(DevelopmentCheckpoint.id))
        .select_from(DevelopmentCheckpoint)
        .join(DevelopmentPlan, DevelopmentCheckpoint.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .group_by(DevelopmentCheckpoint.overall_assessment)
    )
    checkpoint_assessments = {r[0]: r[1] for r in result.all()}
    if checkpoint_assessments:
        lines.append(f"Checkpoint assessments: {checkpoint_assessments}")

    # Overdue goals
    result = await db.execute(
        select(User.name, DevelopmentGoal.title, DevelopmentGoal.target_date, DevelopmentGoal.status)
        .select_from(DevelopmentGoal)
        .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
        .join(User, DevelopmentPlan.user_id == User.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentGoal.target_date.isnot(None))
        .where(DevelopmentGoal.target_date < today)
        .where(DevelopmentGoal.status != "completed")
        .order_by(DevelopmentGoal.target_date)
        .limit(20)
    )
    overdue = result.all()
    if overdue:
        lines.append("\nOverdue development goals:")
        for o in overdue:
            lines.append(f"  - {o[0]}: \"{o[1]}\", due {o[2]} [{o[3]}]")

    # Budget totals: total_budget vs actual_cost
    result = await db.execute(
        select(func.sum(DevelopmentPlan.total_budget))
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentPlan.total_budget.isnot(None))
    )
    budget_total = result.scalar()

    result = await db.execute(
        select(func.sum(DevelopmentGoal.actual_cost))
        .select_from(DevelopmentGoal)
        .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentGoal.actual_cost.isnot(None))
    )
    actual_spent = result.scalar()

    result = await db.execute(
        select(func.sum(DevelopmentGoal.cost_estimate))
        .select_from(DevelopmentGoal)
        .join(DevelopmentPlan, DevelopmentGoal.plan_id == DevelopmentPlan.id)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .where(DevelopmentGoal.cost_estimate.isnot(None))
    )
    total_estimated = result.scalar()

    budget_lines = []
    if budget_total:
        budget_lines.append(f"Total plan budgets: {budget_total:.2f}")
    if actual_spent:
        budget_lines.append(f"Total actual spend: {actual_spent:.2f}")
    if total_estimated:
        budget_lines.append(f"Total estimated cost (goals): {total_estimated:.2f}")
    if budget_lines:
        lines.append("\n" + "\n".join(budget_lines))

    return "\n".join(lines)


async def gather_performance_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Performance Reviews Data\n"]

    result = await db.execute(
        select(ReviewCycle.name, ReviewCycle.status, ReviewCycle.period_start, ReviewCycle.period_end)
        .where(ReviewCycle.workspace_id == workspace_id)
        .order_by(ReviewCycle.period_start.desc())
        .limit(10)
    )
    cycles = result.all()
    if cycles:
        lines.append("Review cycles:")
        for c in cycles:
            lines.append(f"  - {c[0]}: {c[1]} ({c[2]} to {c[3]})")

    result = await db.execute(
        select(Review.status, func.count(Review.id))
        .where(Review.workspace_id == workspace_id)
        .group_by(Review.status)
    )
    review_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Reviews by status: {review_status}")

    result = await db.execute(
        select(
            func.avg(Review.overall_rating),
            func.min(Review.overall_rating),
            func.max(Review.overall_rating),
            func.count(Review.overall_rating),
        )
        .where(Review.workspace_id == workspace_id)
        .where(Review.overall_rating.isnot(None))
    )
    row = result.one()
    if row[3] > 0:
        lines.append(f"Ratings: avg {round(float(row[0]), 2)}, min {row[1]}, max {row[2]} ({row[3]} rated)")

    # Rating distribution
    result = await db.execute(
        select(Review.overall_rating, func.count(Review.id))
        .where(Review.workspace_id == workspace_id)
        .where(Review.overall_rating.isnot(None))
        .group_by(Review.overall_rating)
        .order_by(Review.overall_rating)
    )
    dist = result.all()
    if dist:
        lines.append("Rating distribution: " + ", ".join(f"rating {d[0]}: {d[1]}" for d in dist))

    # Incomplete reviews
    result = await db.execute(
        select(User.name, Review.status, ReviewCycle.name)
        .join(User, Review.user_id == User.id)
        .join(ReviewCycle, Review.cycle_id == ReviewCycle.id)
        .where(Review.workspace_id == workspace_id)
        .where(Review.status.notin_(["finalised"]))
        .limit(30)
    )
    incomplete = result.all()
    if incomplete:
        lines.append(f"\nIncomplete reviews ({len(incomplete)}):")
        for i in incomplete:
            lines.append(f"  - {i[0]}: {i[1]} (cycle: {i[2]})")

    return "\n".join(lines)


async def gather_onboarding_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Onboarding Data\n"]

    result = await db.execute(
        select(OnboardingChecklist.status, func.count(OnboardingChecklist.id))
        .where(OnboardingChecklist.workspace_id == workspace_id)
        .group_by(OnboardingChecklist.status)
    )
    status_counts = {r[0]: r[1] for r in result.all()}
    lines.append(f"Checklist status: {status_counts}")

    result = await db.execute(
        select(OnboardingChecklist.checklist_type, func.count(OnboardingChecklist.id))
        .where(OnboardingChecklist.workspace_id == workspace_id)
        .group_by(OnboardingChecklist.checklist_type)
    )
    by_type = {r[0]: r[1] for r in result.all()}
    lines.append(f"By type: {by_type}")

    # Active checklists with progress
    result = await db.execute(
        select(
            User.name,
            OnboardingChecklist.checklist_type,
            func.count(OnboardingChecklistItem.id),
            func.sum(case((OnboardingChecklistItem.completed == True, 1), else_=0)),  # noqa: E712
        )
        .select_from(OnboardingChecklist)
        .join(User, OnboardingChecklist.user_id == User.id)
        .join(OnboardingChecklistItem, OnboardingChecklistItem.checklist_id == OnboardingChecklist.id)
        .where(OnboardingChecklist.workspace_id == workspace_id)
        .where(OnboardingChecklist.status == "in_progress")
        .group_by(User.name, OnboardingChecklist.checklist_type, OnboardingChecklist.id)
        .limit(30)
    )
    active = result.all()
    if active:
        lines.append("\nActive checklists:")
        for a in active:
            total = a[2]
            done = a[3] or 0
            pct = round(done / total * 100, 1) if total > 0 else 0
            lines.append(f"  - {a[0]} ({a[1]}): {done}/{total} items ({pct}%)")

    return "\n".join(lines)


async def gather_early_talent_context(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    lines = ["## Early Talent Programmes Data\n"]
    today = date.today()

    # Programme counts by type
    result = await db.execute(
        select(EarlyTalentProgramme.programme_type, func.count(EarlyTalentProgramme.id))
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .group_by(EarlyTalentProgramme.programme_type)
    )
    by_type = {r[0]: r[1] for r in result.all()}
    lines.append(f"Programmes by type: {by_type}")

    # Programme status
    result = await db.execute(
        select(EarlyTalentProgramme.status, func.count(EarlyTalentProgramme.id))
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .group_by(EarlyTalentProgramme.status)
    )
    by_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Programmes by status: {by_status}")

    # Participant stats
    result = await db.execute(
        select(EarlyTalentParticipant.status, func.count(EarlyTalentParticipant.id))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .group_by(EarlyTalentParticipant.status)
    )
    participant_status = {r[0]: r[1] for r in result.all()}
    lines.append(f"Participants by status: {participant_status}")

    # Average qualification progress
    result = await db.execute(
        select(func.avg(EarlyTalentParticipant.qualification_progress))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
    )
    avg_qual = result.scalar()
    if avg_qual is not None:
        lines.append(f"Average qualification progress: {round(float(avg_qual), 1)}%")

    # Participants with details
    result = await db.execute(
        select(
            User.name,
            EarlyTalentProgramme.name,
            EarlyTalentProgramme.programme_type,
            EarlyTalentParticipant.status,
            EarlyTalentParticipant.qualification_progress,
            EarlyTalentParticipant.university,
        )
        .select_from(EarlyTalentParticipant)
        .join(User, EarlyTalentParticipant.user_id == User.id)
        .join(EarlyTalentProgramme, EarlyTalentParticipant.programme_id == EarlyTalentProgramme.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .limit(30)
    )
    participants = result.all()
    if participants:
        lines.append("\nParticipants:")
        for p in participants:
            uni = f" ({p[5]})" if p[5] else ""
            lines.append(f"  - {p[0]}: {p[1]} [{p[2]}], {p[3]}, qual progress {p[4]}%{uni}")

    # Milestone status
    result = await db.execute(
        select(EarlyTalentMilestone.status, func.count(EarlyTalentMilestone.id))
        .select_from(EarlyTalentMilestone)
        .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .group_by(EarlyTalentMilestone.status)
    )
    milestone_status = {r[0]: r[1] for r in result.all()}
    if milestone_status:
        lines.append(f"\nMilestones by status: {milestone_status}")

    # Overdue milestones
    result = await db.execute(
        select(User.name, EarlyTalentMilestone.title, EarlyTalentMilestone.target_date)
        .select_from(EarlyTalentMilestone)
        .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
        .join(User, EarlyTalentParticipant.user_id == User.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .where(EarlyTalentMilestone.status != "completed")
        .where(EarlyTalentMilestone.target_date.isnot(None))
        .where(EarlyTalentMilestone.target_date < today)
        .order_by(EarlyTalentMilestone.target_date)
        .limit(20)
    )
    overdue = result.all()
    if overdue:
        lines.append(f"\nOverdue milestones ({len(overdue)}):")
        for o in overdue:
            lines.append(f"  - {o[0]}: \"{o[1]}\", due {o[2]}")

    # Rotation completion
    result = await db.execute(
        select(EarlyTalentRotationAssignment.status, func.count(EarlyTalentRotationAssignment.id))
        .select_from(EarlyTalentRotationAssignment)
        .join(EarlyTalentParticipant, EarlyTalentRotationAssignment.participant_id == EarlyTalentParticipant.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .group_by(EarlyTalentRotationAssignment.status)
    )
    rotation_status = {r[0]: r[1] for r in result.all()}
    if rotation_status:
        lines.append(f"\nRotation assignments by status: {rotation_status}")

    # Average rotation rating
    result = await db.execute(
        select(func.avg(EarlyTalentRotationAssignment.rating))
        .select_from(EarlyTalentRotationAssignment)
        .join(EarlyTalentParticipant, EarlyTalentRotationAssignment.participant_id == EarlyTalentParticipant.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .where(EarlyTalentRotationAssignment.rating.isnot(None))
    )
    avg_rating = result.scalar()
    if avg_rating is not None:
        lines.append(f"Average rotation rating: {round(float(avg_rating), 1)}/5")

    # Cohort summary
    result = await db.execute(
        select(EarlyTalentCohort.name, EarlyTalentCohort.status, EarlyTalentCohort.intake_date, EarlyTalentProgramme.name)
        .select_from(EarlyTalentCohort)
        .join(EarlyTalentProgramme, EarlyTalentCohort.programme_id == EarlyTalentProgramme.id)
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .order_by(EarlyTalentCohort.intake_date.desc())
        .limit(20)
    )
    cohorts = result.all()
    if cohorts:
        lines.append("\nCohorts:")
        for c in cohorts:
            lines.append(f"  - {c[0]} ({c[3]}): {c[1]}, intake {c[2]}")

    # Mentor engagement, participants without mentors
    result = await db.execute(
        select(func.count(EarlyTalentParticipant.id))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .where(EarlyTalentParticipant.mentor_id.is_(None))
        .where(EarlyTalentParticipant.status == "enrolled")
    )
    no_mentor = result.scalar() or 0
    if no_mentor > 0:
        lines.append(f"\nActive participants without mentor: {no_mentor}")

    return "\n".join(lines)


# Dispatcher
GATHERERS = {
    "team_health": gather_team_health_context,
    "compliance": gather_compliance_context,
    "skills_gap": gather_skills_gap_context,
    "leave_forecast": gather_leave_forecast_context,
    "objectives": gather_objectives_context,
    "recruitment": gather_recruitment_context,
    "development": gather_development_context,
    "performance": gather_performance_context,
    "onboarding": gather_onboarding_context,
    "early_talent": gather_early_talent_context,
}


async def gather_context(report_type: str, db: AsyncSession, workspace_id: uuid.UUID) -> str:
    if report_type == "executive_summary":
        sections = []
        for name, fn in GATHERERS.items():
            try:
                sections.append(await fn(db, workspace_id))
            except Exception as e:
                sections.append(f"## {name}\n(Error gathering data: {e})")
        return "\n\n".join(sections)

    gatherer = GATHERERS.get(report_type)
    if gatherer is not None:
        return await gatherer(db, workspace_id)
    return "(No context data available for this report type)"


def build_analysis_prompt(report_type: str, context: str) -> list[dict]:
    from app.schemas.analysis_report import ANALYSIS_TYPES
    type_info = ANALYSIS_TYPES.get(report_type, {})
    label = type_info.get("label", report_type)

    system = f"""You are an expert people analytics consultant producing a {label} report for a management team.

Instructions:
- Produce a well-structured markdown report
- Start with a brief executive summary (3-4 sentences)
- Include clearly headed analysis sections relevant to the data provided
- Highlight key risks and items needing immediate attention
- End with prioritised, actionable recommendations
- Use tables where appropriate for clarity
- Be specific, reference actual names, dates, and numbers from the data
- If any area has no data, briefly note it and move on
- Keep the tone professional but direct
- Do not invent data, only use what is provided below"""

    user = f"""Generate a comprehensive **{label}** report based on the following data:

{context}

Structure the report with clear markdown headings, bullet points, and tables where appropriate."""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


async def generate_report(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    report_type: str,
) -> AnalysisReport:
    from app.schemas.analysis_report import ANALYSIS_TYPES
    type_info = ANALYSIS_TYPES.get(report_type, {})
    title = f"{type_info.get('label', report_type)}, {date.today().strftime('%d %b %Y')}"

    report = AnalysisReport(
        workspace_id=workspace_id,
        user_id=user_id,
        report_type=report_type,
        title=title,
        status="generating",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    start = time.time()
    try:
        context = await gather_context(report_type, db, workspace_id)
        messages = build_analysis_prompt(report_type, context)
        content = await call_llm(messages)
        elapsed = round(time.time() - start, 1)

        report.content = content
        report.status = "completed"
        report.generation_time_seconds = elapsed
    except Exception as e:
        elapsed = round(time.time() - start, 1)
        report.content = f"Report generation failed: {e}"
        report.status = "failed"
        report.generation_time_seconds = elapsed

    await db.commit()
    await db.refresh(report)
    return report
