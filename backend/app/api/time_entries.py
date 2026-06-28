import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryResponse
from app.utils.auth import get_workspace_user

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["time-entries"])


def _to_response(te: TimeEntry, user: User | None = None, task: Task | None = None) -> TimeEntryResponse:
    data = TimeEntryResponse.model_validate(te)
    if user:
        data.user_name = user.name
    if task:
        data.task_name = task.name
    return data


@router.post("/tasks/{task_id}/time-entries", response_model=TimeEntryResponse, status_code=201)
async def create_time_entry(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TimeEntryCreate,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if not task or task.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Task not found")

    te = TimeEntry(
        workspace_id=workspace_id,
        task_id=task_id,
        user_id=current_user.id,
        minutes=data.minutes,
        description=data.description,
        logged_at=data.logged_at or datetime.now(timezone.utc),
    )
    db.add(te)

    # Update cumulative field on task
    task.time_logged_minutes += data.minutes

    await db.commit()
    await db.refresh(te)
    return _to_response(te, current_user, task)


@router.get("/tasks/{task_id}/time-entries", response_model=list[TimeEntryResponse])
async def list_task_time_entries(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeEntry)
        .where(TimeEntry.task_id == task_id, TimeEntry.workspace_id == workspace_id)
        .order_by(TimeEntry.logged_at.desc())
    )
    entries = result.scalars().all()

    user_ids = {e.user_id for e in entries}
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    task = await db.get(Task, task_id)
    return [_to_response(e, users_map.get(e.user_id), task) for e in entries]


@router.delete("/tasks/{task_id}/time-entries/{entry_id}", status_code=204)
async def delete_time_entry(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    entry_id: uuid.UUID,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimeEntry).where(
            TimeEntry.id == entry_id,
            TimeEntry.task_id == task_id,
            TimeEntry.workspace_id == workspace_id,
        )
    )
    te = result.scalar_one_or_none()
    if not te:
        raise HTTPException(status_code=404, detail="Time entry not found")

    # Update cumulative field on task
    task = await db.get(Task, task_id)
    if task:
        task.time_logged_minutes = max(0, task.time_logged_minutes - te.minutes)

    await db.delete(te)
    await db.commit()


# Workspace-wide time entries (for resource utilisation)
@router.get("/time-entries", response_model=list[TimeEntryResponse])
async def list_workspace_time_entries(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID | None = Query(None),
    since: str | None = Query(None),
    until: str | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(TimeEntry)
        .where(TimeEntry.workspace_id == workspace_id)
        .order_by(TimeEntry.logged_at.desc())
    )
    if user_id:
        query = query.where(TimeEntry.user_id == user_id)
    if since:
        query = query.where(TimeEntry.logged_at >= since)
    if until:
        query = query.where(TimeEntry.logged_at <= until)

    result = await db.execute(query.limit(limit))
    entries = result.scalars().all()

    user_ids = {e.user_id for e in entries}
    task_ids = {e.task_id for e in entries}

    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    tasks_result = await db.execute(select(Task).where(Task.id.in_(task_ids)))
    tasks_map = {t.id: t for t in tasks_result.scalars().all()}

    return [_to_response(e, users_map.get(e.user_id), tasks_map.get(e.task_id)) for e in entries]


# Resource utilisation summary
@router.get("/resource-utilisation")
async def resource_utilisation(
    workspace_id: uuid.UUID,
    since: str | None = Query(None),
    until: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all members
    members_result = await db.execute(
        select(User).where(User.workspace_id == workspace_id)
    )
    members = members_result.scalars().all()

    # Get task counts and time logged per user
    task_count_query = (
        select(
            Task.assignees,
        )
    )

    # Simpler approach: get tasks per user via the association table
    from app.models.task import task_assignees
    from sqlalchemy import and_

    results = []
    for member in members:
        # Count assigned tasks
        task_count_result = await db.execute(
            select(func.count())
            .select_from(task_assignees)
            .join(Task, Task.id == task_assignees.c.task_id)
            .where(
                task_assignees.c.user_id == member.id,
                Task.workspace_id == workspace_id,
                Task.status.notin_(["done", "completed", "cancelled"]),
            )
        )
        active_tasks = task_count_result.scalar_one()

        # Count overdue tasks
        from datetime import date
        overdue_result = await db.execute(
            select(func.count())
            .select_from(task_assignees)
            .join(Task, Task.id == task_assignees.c.task_id)
            .where(
                task_assignees.c.user_id == member.id,
                Task.workspace_id == workspace_id,
                Task.status.notin_(["done", "completed", "cancelled"]),
                Task.date_to < date.today(),
                Task.date_to.isnot(None),
            )
        )
        overdue_tasks = overdue_result.scalar_one()

        # Time logged
        time_query = select(func.coalesce(func.sum(TimeEntry.minutes), 0)).where(
            TimeEntry.user_id == member.id,
            TimeEntry.workspace_id == workspace_id,
        )
        if since:
            time_query = time_query.where(TimeEntry.logged_at >= since)
        if until:
            time_query = time_query.where(TimeEntry.logged_at <= until)

        time_result = await db.execute(time_query)
        total_minutes = time_result.scalar_one()

        # Time estimated on assigned tasks
        estimate_result = await db.execute(
            select(func.coalesce(func.sum(Task.time_estimate_minutes), 0))
            .select_from(task_assignees)
            .join(Task, Task.id == task_assignees.c.task_id)
            .where(
                task_assignees.c.user_id == member.id,
                Task.workspace_id == workspace_id,
                Task.status.notin_(["done", "completed", "cancelled"]),
            )
        )
        total_estimate = estimate_result.scalar_one()

        results.append({
            "user_id": str(member.id),
            "user_name": member.name,
            "user_colour": member.colour,
            "user_initials": member.initials,
            "user_avatar_url": member.avatar_url,
            "active_tasks": active_tasks,
            "overdue_tasks": overdue_tasks,
            "total_minutes_logged": total_minutes,
            "total_estimate_minutes": total_estimate,
        })

    # Sort by active tasks descending
    results.sort(key=lambda r: r["active_tasks"] or 0, reverse=True)
    return results


# Absence calendar endpoint
@router.get("/absences")
async def absence_calendar(
    workspace_id: uuid.UUID,
    since: str | None = Query(None),
    until: str | None = Query(None),
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.time_off import TimeOff
    from app.models.leave import LeaveRequest

    # Get approved leave requests
    leave_query = (
        select(LeaveRequest)
        .where(
            LeaveRequest.workspace_id == workspace_id,
            LeaveRequest.status == "approved",
        )
    )
    if since:
        leave_query = leave_query.where(LeaveRequest.end_date >= since)
    if until:
        leave_query = leave_query.where(LeaveRequest.start_date <= until)

    leave_result = await db.execute(leave_query)
    leaves = leave_result.scalars().all()

    # Get time off entries
    time_off_query = (
        select(TimeOff)
        .where(TimeOff.workspace_id == workspace_id)
    )
    if since:
        time_off_query = time_off_query.where(TimeOff.date_to >= since)
    if until:
        time_off_query = time_off_query.where(TimeOff.date_from <= until)

    time_off_result = await db.execute(time_off_query)
    time_offs = time_off_result.scalars().all()

    # Get user details
    user_ids = {l.user_id for l in leaves} | {t.user_id for t in time_offs}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in users_result.scalars().all()}
    else:
        users_map = {}

    # Leave type colours
    LEAVE_COLOURS = {
        "annual": "#3b82f6",
        "sick": "#ef4444",
        "compassionate": "#8b5cf6",
        "toil": "#14b8a6",
        "training": "#f59e0b",
        "unpaid": "#64748b",
    }

    absences = []

    for l in leaves:
        user = users_map.get(l.user_id)
        absences.append({
            "id": str(l.id),
            "type": "leave",
            "user_id": str(l.user_id),
            "user_name": user.name if user else "Unknown",
            "user_colour": user.colour if user else "#ccc",
            "user_initials": user.initials if user else "?",
            "user_avatar_url": user.avatar_url if user else None,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "label": l.leave_type.replace("_", " ").title(),
            "colour": LEAVE_COLOURS.get(l.leave_type, "#94A3B8"),
            "days": l.days,
        })

    for t in time_offs:
        user = users_map.get(t.user_id)
        absences.append({
            "id": str(t.id),
            "type": "time_off",
            "user_id": str(t.user_id),
            "user_name": user.name if user else "Unknown",
            "user_colour": user.colour if user else "#ccc",
            "user_initials": user.initials if user else "?",
            "user_avatar_url": user.avatar_url if user else None,
            "start_date": str(t.date_from),
            "end_date": str(t.date_to),
            "label": t.reason or "Time Off",
            "colour": t.colour or "#94A3B8",
        })

    absences.sort(key=lambda a: a["start_date"] or "")
    return absences
