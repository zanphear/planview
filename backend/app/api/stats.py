import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Task, task_assignees
from app.models.project import Project
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/workspaces/{workspace_id}/stats",
    tags=["stats"],
)


@router.get("")
async def get_workspace_stats(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    week_from_now = today + timedelta(days=7)

    # Task counts by status
    status_q = (
        select(Task.status, func.count(Task.id))
        .where(Task.workspace_id == workspace_id)
        .group_by(Task.status)
    )
    status_result = await db.execute(status_q)
    by_status = dict(status_result.all())

    # Total tasks
    total = sum(by_status.values())

    # Overdue tasks (date_to < today AND status != done)
    overdue_q = (
        select(func.count(Task.id))
        .where(
            Task.workspace_id == workspace_id,
            Task.date_to < today,
            Task.status != "done",
        )
    )
    overdue_result = await db.execute(overdue_q)
    overdue = overdue_result.scalar() or 0

    # Due this week
    due_this_week_q = (
        select(func.count(Task.id))
        .where(
            Task.workspace_id == workspace_id,
            Task.date_to >= today,
            Task.date_to <= week_from_now,
            Task.status != "done",
        )
    )
    due_week_result = await db.execute(due_this_week_q)
    due_this_week = due_week_result.scalar() or 0

    # Unassigned tasks
    unassigned_q = (
        select(func.count(Task.id))
        .where(Task.workspace_id == workspace_id)
        .where(
            ~Task.id.in_(
                select(task_assignees.c.task_id).distinct()
            )
        )
    )
    unassigned_result = await db.execute(unassigned_q)
    unassigned = unassigned_result.scalar() or 0

    # Tasks per project
    project_q = (
        select(
            Project.id,
            Project.name,
            Project.colour,
            func.count(Task.id).label("total"),
            func.count(case((Task.status == "done", Task.id))).label("completed"),
        )
        .join(Task, Task.project_id == Project.id, isouter=True)
        .where(Project.workspace_id == workspace_id, Project.status == "active")
        .group_by(Project.id, Project.name, Project.colour)
        .order_by(Project.name)
    )
    project_result = await db.execute(project_q)
    projects = [
        {
            "id": str(row.id),
            "name": row.name,
            "colour": row.colour,
            "total": row.total,
            "completed": row.completed,
        }
        for row in project_result.all()
    ]

    # Tasks per assignee (workload)
    workload_q = (
        select(
            User.id,
            User.name,
            User.colour,
            func.count(Task.id).label("total"),
            func.count(case((Task.status == "done", Task.id))).label("completed"),
        )
        .join(task_assignees, task_assignees.c.user_id == User.id)
        .join(Task, Task.id == task_assignees.c.task_id)
        .where(Task.workspace_id == workspace_id)
        .group_by(User.id, User.name, User.colour)
        .order_by(func.count(Task.id).desc())
    )
    workload_result = await db.execute(workload_q)
    workload = [
        {
            "id": str(row.id),
            "name": row.name,
            "colour": row.colour,
            "total": row.total,
            "completed": row.completed,
        }
        for row in workload_result.all()
    ]

    # Recently created tasks (last 7 days)
    recent_q = (
        select(func.count(Task.id))
        .where(
            Task.workspace_id == workspace_id,
            Task.created_at >= today - timedelta(days=7),
        )
    )
    recent_result = await db.execute(recent_q)
    created_this_week = recent_result.scalar() or 0

    # Completed this week
    # We don't have a completed_at field, so we use updated_at as a proxy
    completed_recent_q = (
        select(func.count(Task.id))
        .where(
            Task.workspace_id == workspace_id,
            Task.status == "done",
            Task.updated_at >= today - timedelta(days=7),
        )
    )
    completed_recent_result = await db.execute(completed_recent_q)
    completed_this_week = completed_recent_result.scalar() or 0

    return {
        "total_tasks": total,
        "by_status": by_status,
        "overdue": overdue,
        "due_this_week": due_this_week,
        "unassigned": unassigned,
        "created_this_week": created_this_week,
        "completed_this_week": completed_this_week,
        "projects": projects,
        "workload": workload,
    }


@router.get("/burndown")
async def get_burndown(
    workspace_id: uuid.UUID,
    days: int = 30,
    project_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return daily created vs completed counts for burndown chart."""
    today = date.today()
    start = today - timedelta(days=days)

    base_filter = [Task.workspace_id == workspace_id]
    if project_id:
        base_filter.append(Task.project_id == project_id)

    # Created per day
    created_q = (
        select(
            func.date_trunc("day", Task.created_at).label("day"),
            func.count(Task.id).label("count"),
        )
        .where(*base_filter, Task.created_at >= start)
        .group_by("day")
        .order_by("day")
    )
    created_rows = await db.execute(created_q)
    created_map = {str(r.day.date()): r.count for r in created_rows.all()}

    # Completed per day (using updated_at as proxy)
    completed_q = (
        select(
            func.date_trunc("day", Task.updated_at).label("day"),
            func.count(Task.id).label("count"),
        )
        .where(*base_filter, Task.status == "done", Task.updated_at >= start)
        .group_by("day")
        .order_by("day")
    )
    completed_rows = await db.execute(completed_q)
    completed_map = {str(r.day.date()): r.count for r in completed_rows.all()}

    # Build daily series
    points = []
    current = start
    remaining = 0
    # Get initial count of open tasks before start date
    initial_q = (
        select(func.count(Task.id))
        .where(*base_filter, Task.created_at < start, Task.status != "done")
    )
    initial_result = await db.execute(initial_q)
    remaining = initial_result.scalar() or 0

    while current <= today:
        key = str(current)
        created_today = created_map.get(key, 0)
        completed_today = completed_map.get(key, 0)
        remaining = remaining + created_today - completed_today
        points.append({
            "date": key,
            "created": created_today,
            "completed": completed_today,
            "remaining": max(0, remaining),
        })
        current += timedelta(days=1)

    return {"points": points, "days": days}
