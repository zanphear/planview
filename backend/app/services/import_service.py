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

    # Detect Trello export format
    if isinstance(data, dict) and "cards" in data:
        return await import_trello_json(db, workspace_id, data)

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


# --- Trello JSON import ---

_TRELLO_STATUS_MAP = {
    "To Do": "todo",
    "Doing": "in_progress",
    "Done": "done",
}


async def import_trello_json(
    db: AsyncSession, workspace_id: uuid.UUID, data: dict
) -> list[Task]:
    """Import from Trello board export JSON (contains 'cards' and 'lists')."""
    lists = {lst["id"]: lst["name"] for lst in data.get("lists", [])}
    labels = {lbl["id"]: lbl for lbl in data.get("labels", [])}
    members = {m["id"]: m.get("fullName", m.get("username", "")) for m in data.get("members", [])}

    tasks = []
    for card in data.get("cards", []):
        if card.get("closed"):
            continue

        list_name = lists.get(card.get("idList", ""), "")
        status = _TRELLO_STATUS_MAP.get(list_name, "todo")

        # Map due date
        due = card.get("due")
        date_to = _parse_date(due[:10]) if due else None

        # Map labels to description note (can't create tags without a project)
        label_names = [labels[lid]["name"] for lid in card.get("idLabels", []) if lid in labels and labels[lid].get("name")]

        # Resolve members by name
        card_member_names = ", ".join(
            members.get(mid, "") for mid in card.get("idMembers", []) if mid in members
        )
        assignee_ids = await _resolve_users(db, workspace_id, card_member_names)

        desc = card.get("desc", "") or ""
        if label_names:
            desc = f"[Labels: {', '.join(label_names)}]\n{desc}" if desc else f"Labels: {', '.join(label_names)}"

        # Map label colour
        colour = None
        if card.get("idLabels"):
            first_label = labels.get(card["idLabels"][0])
            if first_label:
                colour = _TRELLO_COLOUR_MAP.get(first_label.get("color"))

        task = Task(
            name=card.get("name", "Imported card"),
            status=status,
            description=desc or None,
            colour=colour,
            date_to=date_to,
            workspace_id=workspace_id,
        )
        db.add(task)
        await db.flush()

        for uid in assignee_ids:
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=uid))

        tasks.append(task)

    await db.commit()
    return tasks


_TRELLO_COLOUR_MAP = {
    "green": "#5CBF4D",
    "yellow": "#F0C239",
    "orange": "#FF9F1A",
    "red": "#E44332",
    "purple": "#8A00E5",
    "blue": "#4186E0",
    "sky": "#00AECC",
    "lime": "#51E898",
    "pink": "#FF78CB",
    "black": "#344563",
}


# --- Asana CSV import ---

_ASANA_STATUS_MAP = {
    "Upcoming": "todo",
    "In Progress": "in_progress",
    "Complete": "done",
    "Completed": "done",
}


async def import_asana_csv(
    db: AsyncSession, workspace_id: uuid.UUID, content: str
) -> list[Task]:
    """Import from Asana CSV export."""
    reader = csv.DictReader(io.StringIO(content))
    tasks = []

    for row in reader:
        # Asana columns: Task ID, Created At, Completed At, Last Modified,
        # Name, Section/Column, Assignee, Due Date, Notes, Projects, Tags
        name = row.get("Name") or row.get("name") or "Imported task"
        if not name.strip():
            continue

        # Status from Section/Column or Completed At
        section = row.get("Section/Column", "").strip()
        completed_at = row.get("Completed At", "").strip()
        if completed_at:
            status = "done"
        else:
            status = _ASANA_STATUS_MAP.get(section, "todo")

        # Due date
        due = row.get("Due Date") or row.get("due_date") or ""
        date_to = _parse_date(due) if due.strip() else None

        # Assignee
        assignee_name = row.get("Assignee") or row.get("assignee") or ""
        assignee_ids = await _resolve_users(db, workspace_id, assignee_name)

        # Project
        project_name = row.get("Projects") or row.get("projects") or ""
        project_id = await _resolve_project(db, workspace_id, project_name.split(",")[0].strip()) if project_name.strip() else None

        description = row.get("Notes") or row.get("notes") or None

        task = Task(
            name=name.strip(),
            status=status,
            description=description,
            date_to=date_to,
            project_id=project_id,
            workspace_id=workspace_id,
        )
        db.add(task)
        await db.flush()

        for uid in assignee_ids:
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=uid))

        tasks.append(task)

    await db.commit()
    return tasks
