"""
CSV and JSON task import.
"""
import csv
import io
import json
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.task import Task, task_assignees, task_tags
from app.models.tag import Tag
from app.models.user import User


def _parse_date(val: str | None) -> date | None:
    if not val or val.strip() == "":
        return None
    return date.fromisoformat(val.strip())


async def _resolve_users(db: AsyncSession, workspace_id: uuid.UUID, names: str) -> list[uuid.UUID]:
    """Resolve comma-separated user names to IDs."""
    if not names or not names.strip():
        return []
    name_list = [n.strip() for n in names.split(",") if n.strip()]
    result = await db.execute(
        select(User).where(User.workspace_id == workspace_id, User.name.in_(name_list))
    )
    return [u.id for u in result.scalars().all()]


async def _resolve_project(db: AsyncSession, workspace_id: uuid.UUID, name: str | None) -> uuid.UUID | None:
    if not name or not name.strip():
        return None
    result = await db.execute(
        select(Project).where(Project.workspace_id == workspace_id, Project.name == name.strip())
    )
    project = result.scalar_one_or_none()
    return project.id if project else None


async def _resolve_tags(db: AsyncSession, project_id: uuid.UUID | None, names: str) -> list[uuid.UUID]:
    if not names or not names.strip() or not project_id:
        return []
    name_list = [n.strip() for n in names.split(",") if n.strip()]
    result = await db.execute(
        select(Tag).where(Tag.project_id == project_id, Tag.name.in_(name_list))
    )
    return [t.id for t in result.scalars().all()]


async def import_tasks_csv(
    db: AsyncSession, workspace_id: uuid.UUID, content: str
) -> list[Task]:
    """Import tasks from CSV. Returns list of created tasks."""
    reader = csv.DictReader(io.StringIO(content))
    tasks = []

    for row in reader:
        project_id = await _resolve_project(db, workspace_id, row.get("project"))
        assignee_ids = await _resolve_users(db, workspace_id, row.get("assignees", ""))
        tag_ids = await _resolve_tags(db, project_id, row.get("tags", ""))

        task = Task(
            name=row.get("name", "Imported task"),
            status=row.get("status", "todo"),
            description=row.get("description") or None,
            colour=row.get("colour") or None,
            date_from=_parse_date(row.get("date_from")),
            date_to=_parse_date(row.get("date_to")),
            project_id=project_id,
            workspace_id=workspace_id,
        )
        db.add(task)
        await db.flush()

        for uid in assignee_ids:
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=uid))
        for tid in tag_ids:
            await db.execute(task_tags.insert().values(task_id=task.id, tag_id=tid))

        tasks.append(task)

    await db.commit()
    return tasks


async def import_tasks_json(
    db: AsyncSession, workspace_id: uuid.UUID, content: str
) -> list[Task]:
    """Import tasks from JSON array. Returns list of created tasks."""
    data = json.loads(content)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array of tasks")

    tasks = []

    for item in data:
        project_name = item.get("project")
        project_id = await _resolve_project(db, workspace_id, project_name) if project_name else None

        assignee_names = ", ".join(
            a["name"] if isinstance(a, dict) else str(a)
            for a in (item.get("assignees") or [])
        )
        assignee_ids = await _resolve_users(db, workspace_id, assignee_names)

        tag_names = ", ".join(
            t["name"] if isinstance(t, dict) else str(t)
            for t in (item.get("tags") or [])
        )
        tag_ids = await _resolve_tags(db, project_id, tag_names)

        task = Task(
            name=item.get("name", "Imported task"),
            status=item.get("status", "todo"),
            description=item.get("description"),
            colour=item.get("colour"),
            date_from=_parse_date(item.get("date_from")),
            date_to=_parse_date(item.get("date_to")),
            project_id=project_id,
            workspace_id=workspace_id,
        )
        db.add(task)
        await db.flush()

        for uid in assignee_ids:
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=uid))
        for tid in tag_ids:
            await db.execute(task_tags.insert().values(task_id=task.id, tag_id=tid))

        tasks.append(task)

    await db.commit()
    return tasks
