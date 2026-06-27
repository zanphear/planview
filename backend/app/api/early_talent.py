import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.early_talent import (
    EarlyTalentCohort,
    EarlyTalentMilestone,
    EarlyTalentParticipant,
    EarlyTalentProgramme,
    EarlyTalentRotation,
    EarlyTalentRotationAssignment,
)
from app.models.user import User
from app.schemas.early_talent import (
    EarlyTalentCohortCreate,
    EarlyTalentCohortResponse,
    EarlyTalentCohortUpdate,
    EarlyTalentDashboardStats,
    EarlyTalentMilestoneCreate,
    EarlyTalentMilestoneResponse,
    EarlyTalentMilestoneUpdate,
    EarlyTalentParticipantCreate,
    EarlyTalentParticipantResponse,
    EarlyTalentParticipantUpdate,
    EarlyTalentProgrammeCreate,
    EarlyTalentProgrammeResponse,
    EarlyTalentProgrammeUpdate,
    EarlyTalentRotationAssignmentCreate,
    EarlyTalentRotationAssignmentResponse,
    EarlyTalentRotationAssignmentUpdate,
    EarlyTalentRotationCreate,
    EarlyTalentRotationResponse,
    EarlyTalentRotationUpdate,
)
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}/early-talent", tags=["early-talent"])


async def _programme_in_workspace(
    db: AsyncSession, workspace_id: uuid.UUID, programme_id: uuid.UUID
) -> EarlyTalentProgramme:
    """Guard against cross-tenant access via a child resource's parent programme."""
    res = await db.execute(
        select(EarlyTalentProgramme).where(
            EarlyTalentProgramme.id == programme_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    programme = res.scalar_one_or_none()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")
    return programme


async def _participant_in_workspace(
    db: AsyncSession, workspace_id: uuid.UUID, participant_id: uuid.UUID
) -> EarlyTalentParticipant:
    """Guard against cross-tenant access via a child resource's parent participant."""
    res = await db.execute(
        select(EarlyTalentParticipant).where(
            EarlyTalentParticipant.id == participant_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    participant = res.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant


# ---------------------------------------------------------------------------
# Stats, MUST be before /{id} routes
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=EarlyTalentDashboardStats)
async def get_early_talent_stats(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    # Total and active programmes
    result = await db.execute(
        select(func.count(EarlyTalentProgramme.id))
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
    )
    total_programmes = result.scalar() or 0

    result = await db.execute(
        select(func.count(EarlyTalentProgramme.id))
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .where(EarlyTalentProgramme.status == "active")
    )
    active_programmes = result.scalar() or 0

    # By type
    result = await db.execute(
        select(EarlyTalentProgramme.programme_type, func.count(EarlyTalentProgramme.id))
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .group_by(EarlyTalentProgramme.programme_type)
    )
    by_type = {row[0]: row[1] for row in result.all()}

    # Participants
    result = await db.execute(
        select(func.count(EarlyTalentParticipant.id))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
    )
    total_participants = result.scalar() or 0

    result = await db.execute(
        select(func.count(EarlyTalentParticipant.id))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .where(EarlyTalentParticipant.status == "enrolled")
    )
    active_participants = result.scalar() or 0

    # By status
    result = await db.execute(
        select(EarlyTalentParticipant.status, func.count(EarlyTalentParticipant.id))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .group_by(EarlyTalentParticipant.status)
    )
    by_status = {row[0]: row[1] for row in result.all()}

    # Avg qualification progress
    result = await db.execute(
        select(func.avg(EarlyTalentParticipant.qualification_progress))
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
    )
    avg_qual = result.scalar()
    avg_qualification_progress = round(float(avg_qual), 1) if avg_qual is not None else 0.0

    # Overdue milestones
    result = await db.execute(
        select(func.count(EarlyTalentMilestone.id))
        .select_from(EarlyTalentMilestone)
        .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .where(EarlyTalentMilestone.status != "completed")
        .where(EarlyTalentMilestone.target_date.isnot(None))
        .where(EarlyTalentMilestone.target_date < today)
    )
    overdue_milestones = result.scalar() or 0

    # Cohort completion rate
    result = await db.execute(
        select(func.count(EarlyTalentCohort.id))
        .select_from(EarlyTalentCohort)
        .join(EarlyTalentProgramme, EarlyTalentCohort.programme_id == EarlyTalentProgramme.id)
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
    )
    total_cohorts = result.scalar() or 0

    result = await db.execute(
        select(func.count(EarlyTalentCohort.id))
        .select_from(EarlyTalentCohort)
        .join(EarlyTalentProgramme, EarlyTalentCohort.programme_id == EarlyTalentProgramme.id)
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .where(EarlyTalentCohort.status == "completed")
    )
    completed_cohorts = result.scalar() or 0

    cohort_completion_rate = round(completed_cohorts / total_cohorts * 100, 1) if total_cohorts > 0 else 0.0

    return EarlyTalentDashboardStats(
        total_programmes=total_programmes,
        active_programmes=active_programmes,
        total_participants=total_participants,
        active_participants=active_participants,
        by_type=by_type,
        by_status=by_status,
        avg_qualification_progress=avg_qualification_progress,
        overdue_milestones=overdue_milestones,
        cohort_completion_rate=cohort_completion_rate,
    )


# ---------------------------------------------------------------------------
# Programmes CRUD, static routes before /{programme_id}
# ---------------------------------------------------------------------------

@router.get("/programmes", response_model=list[EarlyTalentProgrammeResponse])
async def list_programmes(
    workspace_id: uuid.UUID,
    status: str | None = Query(None),
    programme_type: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(EarlyTalentProgramme)
        .where(EarlyTalentProgramme.workspace_id == workspace_id)
        .order_by(EarlyTalentProgramme.created_at.desc())
    )
    if status:
        query = query.where(EarlyTalentProgramme.status == status)
    if programme_type:
        query = query.where(EarlyTalentProgramme.programme_type == programme_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/programmes", response_model=EarlyTalentProgrammeResponse, status_code=201)
async def create_programme(
    workspace_id: uuid.UUID,
    data: EarlyTalentProgrammeCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    programme = EarlyTalentProgramme(
        workspace_id=workspace_id,
        **data.model_dump(),
    )
    db.add(programme)
    await db.commit()
    await db.refresh(programme)
    return programme


@router.get("/programmes/{programme_id}", response_model=EarlyTalentProgrammeResponse)
async def get_programme(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentProgramme).where(
            EarlyTalentProgramme.id == programme_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    programme = result.scalar_one_or_none()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")
    return programme


@router.put("/programmes/{programme_id}", response_model=EarlyTalentProgrammeResponse)
async def update_programme(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    data: EarlyTalentProgrammeUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentProgramme).where(
            EarlyTalentProgramme.id == programme_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    programme = result.scalar_one_or_none()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(programme, field, value)
    await db.commit()
    await db.refresh(programme)
    return programme


@router.delete("/programmes/{programme_id}", status_code=204)
async def delete_programme(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentProgramme).where(
            EarlyTalentProgramme.id == programme_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    programme = result.scalar_one_or_none()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme not found")
    await db.delete(programme)
    await db.commit()


# ---------------------------------------------------------------------------
# Cohorts, under /programmes/{programme_id}/cohorts
# ---------------------------------------------------------------------------

@router.get("/programmes/{programme_id}/cohorts", response_model=list[EarlyTalentCohortResponse])
async def list_cohorts(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _programme_in_workspace(db, workspace_id, programme_id)
    result = await db.execute(
        select(EarlyTalentCohort)
        .where(EarlyTalentCohort.programme_id == programme_id)
        .order_by(EarlyTalentCohort.intake_date.desc())
    )
    return result.scalars().all()


@router.post("/programmes/{programme_id}/cohorts", response_model=EarlyTalentCohortResponse, status_code=201)
async def create_cohort(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    data: EarlyTalentCohortCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _programme_in_workspace(db, workspace_id, programme_id)
    cohort = EarlyTalentCohort(
        programme_id=programme_id,
        **data.model_dump(),
    )
    db.add(cohort)
    await db.commit()
    await db.refresh(cohort)
    return cohort


@router.put("/cohorts/{cohort_id}", response_model=EarlyTalentCohortResponse)
async def update_cohort(
    workspace_id: uuid.UUID,
    cohort_id: uuid.UUID,
    data: EarlyTalentCohortUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentCohort)
        .join(EarlyTalentProgramme, EarlyTalentCohort.programme_id == EarlyTalentProgramme.id)
        .where(
            EarlyTalentCohort.id == cohort_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    cohort = result.scalar_one_or_none()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cohort, field, value)
    await db.commit()
    await db.refresh(cohort)
    return cohort


# ---------------------------------------------------------------------------
# Rotations, under /programmes/{programme_id}/rotations
# ---------------------------------------------------------------------------

@router.get("/programmes/{programme_id}/rotations", response_model=list[EarlyTalentRotationResponse])
async def list_rotations(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _programme_in_workspace(db, workspace_id, programme_id)
    result = await db.execute(
        select(EarlyTalentRotation)
        .where(EarlyTalentRotation.programme_id == programme_id)
        .order_by(EarlyTalentRotation.sort_order)
    )
    return result.scalars().all()


@router.post("/programmes/{programme_id}/rotations", response_model=EarlyTalentRotationResponse, status_code=201)
async def create_rotation(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID,
    data: EarlyTalentRotationCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _programme_in_workspace(db, workspace_id, programme_id)
    rotation = EarlyTalentRotation(
        programme_id=programme_id,
        **data.model_dump(),
    )
    db.add(rotation)
    await db.commit()
    await db.refresh(rotation)
    return rotation


@router.put("/rotations/{rotation_id}", response_model=EarlyTalentRotationResponse)
async def update_rotation(
    workspace_id: uuid.UUID,
    rotation_id: uuid.UUID,
    data: EarlyTalentRotationUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentRotation)
        .join(EarlyTalentProgramme, EarlyTalentRotation.programme_id == EarlyTalentProgramme.id)
        .where(
            EarlyTalentRotation.id == rotation_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    rotation = result.scalar_one_or_none()
    if not rotation:
        raise HTTPException(status_code=404, detail="Rotation not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rotation, field, value)
    await db.commit()
    await db.refresh(rotation)
    return rotation


@router.delete("/rotations/{rotation_id}", status_code=204)
async def delete_rotation(
    workspace_id: uuid.UUID,
    rotation_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentRotation)
        .join(EarlyTalentProgramme, EarlyTalentRotation.programme_id == EarlyTalentProgramme.id)
        .where(
            EarlyTalentRotation.id == rotation_id,
            EarlyTalentProgramme.workspace_id == workspace_id,
        )
    )
    rotation = result.scalar_one_or_none()
    if not rotation:
        raise HTTPException(status_code=404, detail="Rotation not found")
    await db.delete(rotation)
    await db.commit()


# ---------------------------------------------------------------------------
# Participants, static routes first
# ---------------------------------------------------------------------------

@router.get("/participants", response_model=list[EarlyTalentParticipantResponse])
async def list_participants(
    workspace_id: uuid.UUID,
    programme_id: uuid.UUID | None = Query(None),
    cohort_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(EarlyTalentParticipant)
        .where(EarlyTalentParticipant.workspace_id == workspace_id)
        .order_by(EarlyTalentParticipant.created_at.desc())
    )
    if programme_id:
        query = query.where(EarlyTalentParticipant.programme_id == programme_id)
    if cohort_id:
        query = query.where(EarlyTalentParticipant.cohort_id == cohort_id)
    if status:
        query = query.where(EarlyTalentParticipant.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/participants", response_model=EarlyTalentParticipantResponse, status_code=201)
async def create_participant(
    workspace_id: uuid.UUID,
    data: EarlyTalentParticipantCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    participant = EarlyTalentParticipant(
        workspace_id=workspace_id,
        **data.model_dump(),
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.get("/participants/{participant_id}", response_model=EarlyTalentParticipantResponse)
async def get_participant(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentParticipant)
        .where(
            EarlyTalentParticipant.id == participant_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
        .options(
            selectinload(EarlyTalentParticipant.milestones),
            selectinload(EarlyTalentParticipant.rotation_assignments),
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant


@router.put("/participants/{participant_id}", response_model=EarlyTalentParticipantResponse)
async def update_participant(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    data: EarlyTalentParticipantUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentParticipant).where(
            EarlyTalentParticipant.id == participant_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(participant, field, value)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.delete("/participants/{participant_id}", status_code=204)
async def delete_participant(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentParticipant).where(
            EarlyTalentParticipant.id == participant_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    await db.delete(participant)
    await db.commit()


# ---------------------------------------------------------------------------
# Rotation Assignments, under /participants/{participant_id}/rotations
# ---------------------------------------------------------------------------

@router.post(
    "/participants/{participant_id}/rotations",
    response_model=EarlyTalentRotationAssignmentResponse,
    status_code=201,
)
async def create_rotation_assignment(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    data: EarlyTalentRotationAssignmentCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _participant_in_workspace(db, workspace_id, participant_id)
    assignment = EarlyTalentRotationAssignment(
        participant_id=participant_id,
        **data.model_dump(),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.put(
    "/participants/{participant_id}/rotations/{assignment_id}",
    response_model=EarlyTalentRotationAssignmentResponse,
)
async def update_rotation_assignment(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    assignment_id: uuid.UUID,
    data: EarlyTalentRotationAssignmentUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentRotationAssignment)
        .join(EarlyTalentParticipant, EarlyTalentRotationAssignment.participant_id == EarlyTalentParticipant.id)
        .where(
            EarlyTalentRotationAssignment.id == assignment_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Rotation assignment not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/participants/{participant_id}/rotations/{assignment_id}", status_code=204)
async def delete_rotation_assignment(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    assignment_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentRotationAssignment)
        .join(EarlyTalentParticipant, EarlyTalentRotationAssignment.participant_id == EarlyTalentParticipant.id)
        .where(
            EarlyTalentRotationAssignment.id == assignment_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Rotation assignment not found")
    await db.delete(assignment)
    await db.commit()


# ---------------------------------------------------------------------------
# Milestones, under /participants/{participant_id}/milestones
# ---------------------------------------------------------------------------

@router.post(
    "/participants/{participant_id}/milestones",
    response_model=EarlyTalentMilestoneResponse,
    status_code=201,
)
async def create_milestone(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    data: EarlyTalentMilestoneCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    await _participant_in_workspace(db, workspace_id, participant_id)
    milestone = EarlyTalentMilestone(
        participant_id=participant_id,
        **data.model_dump(),
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.put(
    "/participants/{participant_id}/milestones/{milestone_id}",
    response_model=EarlyTalentMilestoneResponse,
)
async def update_milestone(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: EarlyTalentMilestoneUpdate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentMilestone)
        .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
        .where(
            EarlyTalentMilestone.id == milestone_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/participants/{participant_id}/milestones/{milestone_id}", status_code=204)
async def delete_milestone(
    workspace_id: uuid.UUID,
    participant_id: uuid.UUID,
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EarlyTalentMilestone)
        .join(EarlyTalentParticipant, EarlyTalentMilestone.participant_id == EarlyTalentParticipant.id)
        .where(
            EarlyTalentMilestone.id == milestone_id,
            EarlyTalentParticipant.workspace_id == workspace_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(milestone)
    await db.commit()
