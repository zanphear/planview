import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.websocket.events import emit_event


async def create_notification(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    event_type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    actor_id: uuid.UUID | None = None,
    task_id: uuid.UUID | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        workspace_id=workspace_id,
        event_type=event_type,
        title=title,
        body=body,
        link=link,
        actor_id=actor_id,
        task_id=task_id,
    )
    db.add(notification)
    await db.flush()

    # Broadcast to the user's workspace so their WS client picks it up
    await emit_event(str(workspace_id), "notification.new", {
        "user_id": str(user_id),
        "notification_id": str(notification.id),
        "title": title,
        "event_type": event_type,
    })

    return notification


async def notify_task_assigned(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    task_name: str,
    assignee_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_name: str,
):
    await create_notification(
        db,
        user_id=assignee_id,
        workspace_id=workspace_id,
        event_type="task.assigned",
        title=f"{actor_name} assigned you to \"{task_name}\"",
        actor_id=actor_id,
        task_id=task_id,
    )


async def notify_comment_added(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    task_name: str,
    commenter_id: uuid.UUID,
    commenter_name: str,
    notify_user_ids: list[uuid.UUID],
):
    for uid in notify_user_ids:
        if uid == commenter_id:
            continue
        await create_notification(
            db,
            user_id=uid,
            workspace_id=workspace_id,
            event_type="comment.added",
            title=f"{commenter_name} commented on \"{task_name}\"",
            actor_id=commenter_id,
            task_id=task_id,
        )


async def get_user_notifications(
    db: AsyncSession, user_id: uuid.UUID, workspace_id: uuid.UUID, *, unread_only: bool = False, limit: int = 50
) -> list[Notification]:
    q = (
        select(Notification)
        .where(Notification.user_id == user_id, Notification.workspace_id == workspace_id)
        .options(selectinload(Notification.actor))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        q = q.where(Notification.is_read == False)  # noqa: E712
    result = await db.execute(q)
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, user_id: uuid.UUID, notification_ids: list[uuid.UUID]) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.id.in_(notification_ids), Notification.user_id == user_id)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount


async def unread_count(db: AsyncSession, user_id: uuid.UUID, workspace_id: uuid.UUID) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.workspace_id == workspace_id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return result.scalar_one()
