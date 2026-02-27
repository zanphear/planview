import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity


async def record_activity(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    actor_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    entity_name: str | None = None,
    details: dict | None = None,
):
    activity = Activity(
        workspace_id=workspace_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
    )
    db.add(activity)
    # Don't commit here — let the caller's transaction handle it
