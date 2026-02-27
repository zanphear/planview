import csv
import io
import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Task


async def export_tasks_csv(db: AsyncSession, workspace_id, params: dict) -> str:
    tasks = await _fetch_tasks(db, workspace_id, params)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "name", "status", "date_from", "date_to", "description",
        "colour", "project", "assignees", "tags", "created_at",
    ])
    for t in tasks:
        writer.writerow([
            str(t.id),
            t.name,
            t.status,
            t.date_from or "",
            t.date_to or "",
            t.description or "",
            t.colour or "",
            t.project.name if t.project else "",
            ", ".join(a.name for a in t.assignees),
            ", ".join(tag.name for tag in t.tags),
            t.created_at.isoformat(),
        ])
    return output.getvalue()


async def export_tasks_json(db: AsyncSession, workspace_id, params: dict) -> str:
    tasks = await _fetch_tasks(db, workspace_id, params)
    data = []
    for t in tasks:
        data.append({
            "id": str(t.id),
            "name": t.name,
            "status": t.status,
            "date_from": t.date_from,
            "date_to": t.date_to,
            "description": t.description,
            "colour": t.colour,
            "project": t.project.name if t.project else None,
            "assignees": [{"id": str(a.id), "name": a.name} for a in t.assignees],
            "tags": [{"id": str(tag.id), "name": tag.name} for tag in t.tags],
            "created_at": t.created_at.isoformat(),
        })
    return json.dumps(data, indent=2, default=str)


async def export_tasks_ics(db: AsyncSession, workspace_id, params: dict) -> str:
    tasks = await _fetch_tasks(db, workspace_id, params)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Planview//EN",
        "CALSCALE:GREGORIAN",
    ]
    for t in tasks:
        if not t.date_from:
            continue
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{t.id}")
        lines.append(f"DTSTART;VALUE=DATE:{t.date_from.replace('-', '')}")
        if t.date_to:
            lines.append(f"DTEND;VALUE=DATE:{t.date_to.replace('-', '')}")
        lines.append(f"SUMMARY:{_ical_escape(t.name)}")
        if t.description:
            lines.append(f"DESCRIPTION:{_ical_escape(t.description)}")
        lines.append(f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


def _ical_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


async def _fetch_tasks(db: AsyncSession, workspace_id, params: dict) -> list[Task]:
    q = (
        select(Task)
        .where(Task.workspace_id == workspace_id)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.tags),
            selectinload(Task.project),
        )
        .order_by(Task.created_at)
    )
    if params.get("project_id"):
        q = q.where(Task.project_id == params["project_id"])
    result = await db.execute(q)
    return list(result.scalars().all())
