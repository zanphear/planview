import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.checklist import Checklist
from app.models.tag import Tag
from app.models.task import Task, task_assignees, task_tags
from app.models.user import User
from app.schemas.task import (
    ChecklistCreate,
    ChecklistResponse,
    ChecklistUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.utils.auth import get_current_user
from app.websocket.events import emit_event
from app.services.notification_service import notify_task_assigned
from app.services.activity_service import record_activity

router = APIRouter(prefix="/workspaces/{workspace_id}/tasks", tags=["tasks"])


def _task_to_dict(task) -> dict:
    """Serialize a Task ORM object to a JSON-safe dict for WS broadcast."""
    return TaskResponse.model_validate(task).model_dump(mode="json")


def _task_query(workspace_id: uuid.UUID):
    return (
        select(Task)
        .where(Task.workspace_id == workspace_id)
        .options(
            selectinload(Task.assignees),
            selectinload(Task.tags),
            selectinload(Task.checklists),
            selectinload(Task.project),
            selectinload(Task.subtasks),
        )
    )


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID | None = None,
    status: str | None = None,
    assignee: uuid.UUID | None = None,
    segment_id: uuid.UUID | None = None,
    since: date | None = None,
    until: date | None = None,
    tag_id: uuid.UUID | None = None,
    filter: str | None = Query(None, description="backlog|timeline"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = _task_query(workspace_id)

    if project_id:
        query = query.where(Task.project_id == project_id)
    if status:
        query = query.where(Task.status == status)
    if segment_id:
        query = query.where(Task.segment_id == segment_id)
    if since:
        query = query.where(Task.date_to >= since)
    if until:
        query = query.where(Task.date_from <= until)
    if assignee:
        query = query.where(Task.assignees.any(User.id == assignee))
    if tag_id:
        query = query.where(Task.tags.any(Tag.id == tag_id))
    if filter == "backlog":
        query = query.where(Task.date_from.is_(None))
    elif filter == "timeline":
        query = query.where(Task.date_from.isnot(None))

    query = query.order_by(Task.sort_order, Task.created_at)
    result = await db.execute(query)
    return result.scalars().unique().all()


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    workspace_id: uuid.UUID,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        name=data.name,
        description=data.description,
        colour=data.colour,
        status=data.status,
        status_emoji=data.status_emoji,
        date_from=data.date_from,
        date_to=data.date_to,
        start_time=data.start_time,
        end_time=data.end_time,
        time_estimate_minutes=data.time_estimate_minutes,
        time_estimate_mode=data.time_estimate_mode,
        is_recurring=data.is_recurring,
        recurrence_rule=data.recurrence_rule,
        project_id=data.project_id,
        segment_id=data.segment_id,
        parent_id=data.parent_id,
        workspace_id=workspace_id,
    )
    db.add(task)
    await db.flush()

    # Assignees — insert directly into join table to avoid lazy-load on new object
    if data.assignee_ids:
        for uid in data.assignee_ids:
            await db.execute(task_assignees.insert().values(task_id=task.id, user_id=uid))

    # Tags
    if data.tag_ids:
        for tid in data.tag_ids:
            await db.execute(task_tags.insert().values(task_id=task.id, tag_id=tid))

    await db.commit()

    # Re-fetch with relationships
    result = await db.execute(_task_query(workspace_id).where(Task.id == task.id))
    created_task = result.scalar_one()

    # Record activity
    await record_activity(
        db, workspace_id=workspace_id, actor_id=current_user.id,
        action="created", entity_type="task",
        entity_id=created_task.id, entity_name=created_task.name,
    )
    await db.commit()

    # Broadcast task.created event
    await emit_event(str(workspace_id), "task.created", {
        "task": _task_to_dict(created_task),
        "actor_id": str(current_user.id),
    })

    # Notify assignees
    for uid in (data.assignee_ids or []):
        if uid != current_user.id:
            await notify_task_assigned(
                db, workspace_id=workspace_id, task_id=created_task.id,
                task_name=created_task.name, assignee_id=uid,
                actor_id=current_user.id, actor_name=current_user.name,
            )

    return created_task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _task_query(workspace_id).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _task_query(workspace_id).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle assignees separately
    assignee_ids = update_data.pop("assignee_ids", None)
    if assignee_ids is not None:
        users = await db.execute(select(User).where(User.id.in_(assignee_ids)))
        task.assignees = list(users.scalars().all())

    # Handle tags separately
    tag_ids = update_data.pop("tag_ids", None)
    if tag_ids is not None:
        tags = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        task.tags = list(tags.scalars().all())

    # Track previous assignee IDs for notification diff
    prev_assignee_ids = {a.id for a in task.assignees}

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()

    # Re-fetch
    result = await db.execute(_task_query(workspace_id).where(Task.id == task_id))
    updated_task = result.scalar_one()

    # Record activity
    changes = list(update_data.keys())
    if assignee_ids is not None:
        changes.append("assignees")
    if tag_ids is not None:
        changes.append("tags")
    if changes:
        await record_activity(
            db, workspace_id=workspace_id, actor_id=current_user.id,
            action="updated", entity_type="task",
            entity_id=updated_task.id, entity_name=updated_task.name,
            details={"fields": changes},
        )
        await db.commit()

    # Broadcast task.updated event
    await emit_event(str(workspace_id), "task.updated", {
        "task": _task_to_dict(updated_task),
        "actor_id": str(current_user.id),
    })

    # Notify newly assigned users
    if assignee_ids is not None:
        new_ids = set(assignee_ids) - prev_assignee_ids
        for uid in new_ids:
            if uid != current_user.id:
                await notify_task_assigned(
                    db, workspace_id=workspace_id, task_id=updated_task.id,
                    task_name=updated_task.name, assignee_id=uid,
                    actor_id=current_user.id, actor_name=current_user.name,
                )

    return updated_task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.workspace_id == workspace_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_name = task.name
    await record_activity(
        db, workspace_id=workspace_id, actor_id=current_user.id,
        action="deleted", entity_type="task",
        entity_id=task_id, entity_name=task_name,
    )
    await db.delete(task)
    await db.commit()

    # Broadcast task.deleted event
    await emit_event(str(workspace_id), "task.deleted", {
        "task_id": str(task_id),
        "actor_id": str(current_user.id),
    })


# --- Duplicate ---

@router.post("/{task_id}/duplicate", response_model=TaskResponse, status_code=201)
async def duplicate_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _task_query(workspace_id).where(Task.id == task_id)
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Task not found")

    clone = Task(
        name=f"{original.name} (copy)",
        description=original.description,
        colour=original.colour,
        status=original.status,
        status_emoji=original.status_emoji,
        date_from=original.date_from,
        date_to=original.date_to,
        start_time=original.start_time,
        end_time=original.end_time,
        time_estimate_minutes=original.time_estimate_minutes,
        time_estimate_mode=original.time_estimate_mode,
        project_id=original.project_id,
        segment_id=original.segment_id,
        workspace_id=workspace_id,
    )
    db.add(clone)
    await db.flush()

    # Copy assignees
    for assignee in original.assignees:
        await db.execute(task_assignees.insert().values(task_id=clone.id, user_id=assignee.id))

    # Copy tags
    for tag in original.tags:
        await db.execute(task_tags.insert().values(task_id=clone.id, tag_id=tag.id))

    # Copy checklists
    for item in original.checklists:
        new_item = Checklist(title=item.title, task_id=clone.id, sort_order=item.sort_order)
        db.add(new_item)

    await db.commit()

    # Re-fetch with relationships
    result = await db.execute(_task_query(workspace_id).where(Task.id == clone.id))
    created_task = result.scalar_one()

    await emit_event(str(workspace_id), "task.created", {
        "task": _task_to_dict(created_task),
        "actor_id": str(current_user.id),
    })

    return created_task


# --- Bulk update ---

class BulkTaskUpdate(TaskUpdate):
    task_ids: list[uuid.UUID]


@router.put("", response_model=list[TaskResponse])
async def bulk_update_tasks(
    workspace_id: uuid.UUID,
    data: BulkTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _task_query(workspace_id).where(Task.id.in_(data.task_ids))
    )
    tasks = list(result.scalars().unique().all())

    update_data = data.model_dump(exclude_unset=True, exclude={"task_ids"})

    assignee_ids = update_data.pop("assignee_ids", None)
    tag_ids = update_data.pop("tag_ids", None)

    users_list = None
    if assignee_ids is not None:
        users = await db.execute(select(User).where(User.id.in_(assignee_ids)))
        users_list = list(users.scalars().all())

    tags_list = None
    if tag_ids is not None:
        tags = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        tags_list = list(tags.scalars().all())

    for task in tasks:
        if users_list is not None:
            task.assignees = users_list
        if tags_list is not None:
            task.tags = tags_list
        for field, value in update_data.items():
            setattr(task, field, value)

    await db.commit()

    result = await db.execute(
        _task_query(workspace_id).where(Task.id.in_(data.task_ids))
    )
    updated_tasks = list(result.scalars().unique().all())

    # Broadcast each updated task
    for t in updated_tasks:
        await emit_event(str(workspace_id), "task.updated", {
            "task": _task_to_dict(t),
            "actor_id": str(current_user.id),
        })

    return updated_tasks


# --- Checklists ---

@router.get("/{task_id}/checklists", response_model=list[ChecklistResponse])
async def list_checklists(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Checklist).where(Checklist.task_id == task_id).order_by(Checklist.sort_order)
    )
    return result.scalars().all()


@router.post("/{task_id}/checklists", response_model=ChecklistResponse, status_code=201)
async def create_checklist(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    data: ChecklistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get max sort_order for this task
    result = await db.execute(
        select(Checklist).where(Checklist.task_id == task_id).order_by(Checklist.sort_order.desc())
    )
    existing = result.scalars().first()
    sort_order = (existing.sort_order + 1) if existing else 0

    item = Checklist(title=data.title, task_id=task_id, sort_order=sort_order)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{task_id}/checklists/{checklist_id}", response_model=ChecklistResponse)
async def update_checklist(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    checklist_id: uuid.UUID,
    data: ChecklistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Checklist).where(Checklist.id == checklist_id, Checklist.task_id == task_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{task_id}/checklists/{checklist_id}", status_code=204)
async def delete_checklist(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    checklist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Checklist).where(Checklist.id == checklist_id, Checklist.task_id == task_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    await db.delete(item)
    await db.commit()
