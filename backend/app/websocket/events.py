from app.websocket.manager import manager


async def emit_event(workspace_id: str, event_type: str, data: dict):
    await manager.broadcast(
        workspace_id,
        {"type": event_type, "data": data},
    )
