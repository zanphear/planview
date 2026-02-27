import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, workspace_id: str):
        await websocket.accept()
        self.active_connections[workspace_id].append(websocket)

    def disconnect(self, websocket: WebSocket, workspace_id: str):
        self.active_connections[workspace_id] = [
            ws for ws in self.active_connections[workspace_id] if ws is not websocket
        ]

    async def broadcast(self, workspace_id: str, event: dict, exclude: WebSocket | None = None):
        message = json.dumps(event)
        dead = []
        for ws in self.active_connections[workspace_id]:
            if ws is exclude:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, workspace_id)


manager = ConnectionManager()
