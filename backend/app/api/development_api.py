import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.competency import UserCompetency
from app.models.development import (
    CareerPathway,
    DevelopmentCheckpoint,
    DevelopmentGoal,
    DevelopmentMilestone,
    DevelopmentPlan,
)
from app.models.user import User
from app.schemas.development import (
    CareerPathwayCreate,
    CareerPathwayResponse,
    CareerPathwayUpdate,
    DevelopmentCheckpointCreate,
    DevelopmentCheckpointResponse,
    DevelopmentCheckpointUpdate,
    DevelopmentGoalCreate,
    DevelopmentGoalResponse,
    DevelopmentGoalUpdate,
    DevelopmentMilestoneCreate,
    DevelopmentMilestoneResponse,
    DevelopmentMilestoneUpdate,
    DevelopmentPlanCreate,
    DevelopmentPlanResponse,
    DevelopmentPlanUpdate,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/development", tags=["development"])


# ====================================================================
# Static routes MUST come before /{plan_id} to avoid path conflicts
# ====================================================================

# --- Career Pathways ---

@router.get("/pathways", response_model=list[CareerPathwayResponse])
async def list_pathways(
    workspace_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CareerPathway)
        .where(CareerPathway.workspace_id == workspace_id)
        .order_by(CareerPathway.name)
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("/pathways", response_model=CareerPathwayResponse, status_code=201)
async def create_pathway(
    workspace_id: uuid.UUID,
    data: CareerPathwayCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    pathway = CareerPathway(workspace_id=workspace_id, **data.model_dump())
    db.add(pathway)
    await db.commit()
    await db.refresh(pathway)
    return pathway


@router.put("/pathways/{pathway_id}", response_model=CareerPathwayResponse)
async def update_pathway(
    workspace_id: uuid.UUID,
    pathway_id: uuid.UUID,
    data: CareerPathwayUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CareerPathway).where(CareerPathway.id == pathway_id, CareerPathway.workspace_id == workspace_id)
    )
    pathway = result.scalar_one_or_none()
    if not pathway:
        raise HTTPException(status_code=404, detail="Career pathway not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pathway, field, value)
    await db.commit()
    await db.refresh(pathway)
    return pathway


@router.delete("/pathways/{pathway_id}", status_code=204)
async def delete_pathway(
    workspace_id: uuid.UUID,
    pathway_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CareerPathway).where(CareerPathway.id == pathway_id, CareerPathway.workspace_id == workspace_id)
    )
    pathway = result.scalar_one_or_none()
    if not pathway:
        raise HTTPException(status_code=404, detail="Career pathway not found")
    await db.delete(pathway)
    await db.commit()


# --- Timeline (all plans/milestones in timeline format) ---

@router.get("/timeline")
async def development_timeline(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    plan_query = (
        select(DevelopmentPlan)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .options(
            selectinload(DevelopmentPlan.milestones),
            selectinload(DevelopmentPlan.goals),
            selectinload(DevelopmentPlan.user),
        )
        .order_by(DevelopmentPlan.start_date.asc().nullslast())
    )
    if user_id:
        plan_query = plan_query.where(DevelopmentPlan.user_id == user_id)

    result = await db.execute(plan_query.limit(limit).offset(offset))
    plans = result.scalars().all()

    timeline = []
    for plan in plans:
        plan_entry = {
            "plan_id": str(plan.id),
            "user_id": str(plan.user_id),
            "user_name": plan.user.name if plan.user else None,
            "status": plan.status,
            "start_date": plan.start_date,
            "end_date": plan.end_date,
            "horizon_years": plan.horizon_years,
            "overall_progress": plan.overall_progress,
            "milestones": [
                {
                    "id": str(m.id),
                    "title": m.title,
                    "target_date": m.target_date,
                    "completed_date": m.completed_date,
                    "status": m.status,
                    "year": m.year,
                }
                for m in sorted(plan.milestones, key=lambda x: (x.year, x.sort_order))
            ],
            "goals": [
                {
                    "id": str(g.id),
                    "title": g.title,
                    "status": g.status,
                    "progress": g.progress,
                    "target_date": g.target_date,
                    "year": g.year,
                }
                for g in plan.goals
            ],
        }
        timeline.append(plan_entry)

    return timeline


# ====================================================================
# Plan CRUD (existing, enhanced)
# ====================================================================

@router.get("", response_model=list[DevelopmentPlanResponse])
async def list_plans(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(DevelopmentPlan)
        .where(DevelopmentPlan.workspace_id == workspace_id)
        .options(
            selectinload(DevelopmentPlan.goals),
            selectinload(DevelopmentPlan.milestones),
            selectinload(DevelopmentPlan.checkpoints),
        )
        .order_by(DevelopmentPlan.created_at.desc())
    )
    if user_id:
        query = query.where(DevelopmentPlan.user_id == user_id)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.post("", response_model=DevelopmentPlanResponse, status_code=201)
async def create_plan(
    workspace_id: uuid.UUID,
    data: DevelopmentPlanCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    plan = DevelopmentPlan(
        workspace_id=workspace_id,
        user_id=data.user_id,
        review_period_id=data.review_period_id,
        career_aspiration=data.career_aspiration,
        horizon_years=data.horizon_years,
        start_date=data.start_date,
        end_date=data.end_date,
        career_pathway_id=data.career_pathway_id,
        total_budget=data.total_budget,
        status="draft",
    )
    db.add(plan)
    await db.flush()

    for goal_data in data.goals:
        goal = DevelopmentGoal(plan_id=plan.id, **goal_data.model_dump())
        db.add(goal)

    for milestone_data in data.milestones:
        milestone = DevelopmentMilestone(plan_id=plan.id, **milestone_data.model_dump())
        db.add(milestone)

    await db.commit()
    result = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.id == plan.id)
        .options(
            selectinload(DevelopmentPlan.goals),
            selectinload(DevelopmentPlan.milestones),
            selectinload(DevelopmentPlan.checkpoints),
        )
    )
    return result.scalar_one()


@router.put("/{plan_id}", response_model=DevelopmentPlanResponse)
async def update_plan(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: DevelopmentPlanUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DevelopmentPlan).where(DevelopmentPlan.id == plan_id, DevelopmentPlan.workspace_id == workspace_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Development plan not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.commit()
    result = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.id == plan_id)
        .options(
            selectinload(DevelopmentPlan.goals),
            selectinload(DevelopmentPlan.milestones),
            selectinload(DevelopmentPlan.checkpoints),
        )
    )
    return result.scalar_one()


# --- Goals ---

@router.post("/{plan_id}/goals", response_model=DevelopmentGoalResponse, status_code=201)
async def add_goal(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: DevelopmentGoalCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    goal = DevelopmentGoal(plan_id=plan_id, **data.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{plan_id}/goals/{goal_id}", response_model=DevelopmentGoalResponse)
async def update_goal(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    goal_id: uuid.UUID,
    data: DevelopmentGoalUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentGoal).join(DevelopmentPlan).where(DevelopmentGoal.id == goal_id, DevelopmentPlan.workspace_id == workspace_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


# --- Milestones ---

@router.post("/{plan_id}/milestones", response_model=DevelopmentMilestoneResponse, status_code=201)
async def add_milestone(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: DevelopmentMilestoneCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    milestone = DevelopmentMilestone(plan_id=plan_id, **data.model_dump())
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.put("/{plan_id}/milestones/{milestone_id}", response_model=DevelopmentMilestoneResponse)
async def update_milestone(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: DevelopmentMilestoneUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentMilestone).join(DevelopmentPlan).where(DevelopmentMilestone.id == milestone_id, DevelopmentPlan.workspace_id == workspace_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/{plan_id}/milestones/{milestone_id}", status_code=204)
async def delete_milestone(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentMilestone).join(DevelopmentPlan).where(DevelopmentMilestone.id == milestone_id, DevelopmentPlan.workspace_id == workspace_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(milestone)
    await db.commit()


# --- Checkpoints ---

@router.get("/{plan_id}/checkpoints", response_model=list[DevelopmentCheckpointResponse])
async def list_checkpoints(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentCheckpoint)
        .where(DevelopmentCheckpoint.plan_id == plan_id)
        .order_by(DevelopmentCheckpoint.checkpoint_date.desc())
    )
    return result.scalars().all()


@router.post("/{plan_id}/checkpoints", response_model=DevelopmentCheckpointResponse, status_code=201)
async def add_checkpoint(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    data: DevelopmentCheckpointCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    checkpoint = DevelopmentCheckpoint(plan_id=plan_id, **data.model_dump())
    db.add(checkpoint)
    await db.commit()
    await db.refresh(checkpoint)
    return checkpoint


@router.put("/{plan_id}/checkpoints/{checkpoint_id}", response_model=DevelopmentCheckpointResponse)
async def update_checkpoint(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    checkpoint_id: uuid.UUID,
    data: DevelopmentCheckpointUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentCheckpoint).join(DevelopmentPlan).where(DevelopmentCheckpoint.id == checkpoint_id, DevelopmentPlan.workspace_id == workspace_id)
    )
    checkpoint = result.scalar_one_or_none()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(checkpoint, field, value)
    await db.commit()
    await db.refresh(checkpoint)
    return checkpoint


# --- Skills Gap Analysis ---

@router.get("/{plan_id}/skills-gap")
async def skills_gap_analysis(
    workspace_id: uuid.UUID,
    plan_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.id == plan_id)
        .options(selectinload(DevelopmentPlan.goals))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Development plan not found")

    # Get user's current competencies
    comp_result = await db.execute(
        select(UserCompetency)
        .where(UserCompetency.user_id == plan.user_id, UserCompetency.workspace_id == workspace_id)
    )
    user_competencies = {str(uc.competency_id): uc for uc in comp_result.scalars().all()}

    # If plan has a career pathway, get its required levels
    pathway_levels = []
    if plan.career_pathway_id:
        pathway_result = await db.execute(
            select(CareerPathway).where(CareerPathway.id == plan.career_pathway_id)
        )
        pathway = pathway_result.scalar_one_or_none()
        if pathway and pathway.levels:
            pathway_levels = pathway.levels

    # Build gaps from goals linked to competencies
    gaps = []
    for goal in plan.goals:
        if goal.linked_competency_id:
            comp_id = str(goal.linked_competency_id)
            uc = user_competencies.get(comp_id)
            gaps.append({
                "goal_id": str(goal.id),
                "goal_title": goal.title,
                "competency_id": comp_id,
                "current_level": uc.level if uc else None,
                "goal_status": goal.status,
                "goal_progress": goal.progress,
                "has_assessment": uc is not None,
            })

    # Pathway-based gap analysis
    pathway_gaps = []
    if pathway_levels:
        for level_entry in pathway_levels:
            if isinstance(level_entry, dict):
                comp_id = str(level_entry.get("competency_id", ""))
                required = level_entry.get("required_level")
                uc = user_competencies.get(comp_id)
                pathway_gaps.append({
                    "competency_id": comp_id,
                    "required_level": required,
                    "current_level": uc.level if uc else None,
                    "met": uc is not None and uc.level == required if required else False,
                })

    return {
        "plan_id": str(plan.id),
        "user_id": str(plan.user_id),
        "career_pathway_id": str(plan.career_pathway_id) if plan.career_pathway_id else None,
        "goal_competency_gaps": gaps,
        "pathway_gaps": pathway_gaps,
        "summary": {
            "total_goals_with_competency": len(gaps),
            "assessed": sum(1 for g in gaps if g["has_assessment"]),
            "unassessed": sum(1 for g in gaps if not g["has_assessment"]),
            "pathway_requirements": len(pathway_gaps),
            "pathway_met": sum(1 for pg in pathway_gaps if pg["met"]),
        },
    }
