"""WebSocket connection manager with a Redis pub/sub backplane.

The local socket registry stays in-process (sockets belong to the worker that
accepted them), but `broadcast` no longer writes to local sockets directly.
Instead it PUBLISHes the event to a per-workspace Redis channel (`ws:{id}`).
Every worker runs one background subscriber that listens on the channels it has
local sockets for and relays received events to those sockets. This makes
fan-out correct across multiple backend workers (ADR 0002).

Note on `exclude`: the published payload carries the *process-local* id of the
sender socket (`id(exclude)`). Only the process that owns that socket (the
publisher) can match it, so exclusion is applied during local delivery in that
process. Other workers never hold the socket, so the id simply never matches.
"""
import asyncio
import json
from collections import defaultdict

import redis.asyncio as redis
from fastapi import WebSocket

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)

CHANNEL_PREFIX = "ws:"


def _channel(workspace_id: str) -> str:
    return f"{CHANNEL_PREFIX}{workspace_id}"


class ConnectionManager:
    def __init__(self):
        # Per-process registry of live sockets, keyed by workspace.
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)
        # Lazily-created, one per process.
        self._redis: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None
        self._reader_task: asyncio.Task | None = None
        # Workspace channels this process is currently subscribed to.
        self._subscribed: set[str] = set()
        # Guards lazy startup; separate from the pubsub-connection guard.
        self._init_lock = asyncio.Lock()
        # Serialises all access to the shared pubsub connection (subscribe /
        # unsubscribe / get_message must never touch it concurrently).
        self._pubsub_lock = asyncio.Lock()

    async def _ensure_started(self) -> None:
        """Create the redis client, pubsub and reader task once per process."""
        if self._redis is not None:
            return
        async with self._init_lock:
            if self._redis is not None:
                return
            try:
                self._redis = redis.from_url(settings.redis_url, decode_responses=True)
                self._pubsub = self._redis.pubsub()
                self._reader_task = asyncio.create_task(self._reader())
                logger.info("ws_backplane_started", redis_url=settings.redis_url)
            except Exception:
                logger.error("ws_backplane_start_failed", exc_info=True)
                raise

    async def connect(self, websocket: WebSocket, workspace_id: str) -> None:
        await websocket.accept()
        self.active_connections[workspace_id].append(websocket)
        await self._ensure_started()
        if workspace_id not in self._subscribed:
            try:
                async with self._pubsub_lock:
                    await self._pubsub.subscribe(_channel(workspace_id))
                self._subscribed.add(workspace_id)
                logger.info("ws_channel_subscribed", workspace_id=workspace_id)
            except Exception:
                logger.error("ws_subscribe_failed", workspace_id=workspace_id, exc_info=True)
                raise

    def disconnect(self, websocket: WebSocket, workspace_id: str) -> None:
        self.active_connections[workspace_id] = [
            ws for ws in self.active_connections[workspace_id] if ws is not websocket
        ]
        if not self.active_connections[workspace_id]:
            # Last local socket for this workspace went away; drop the empty
            # bucket and unsubscribe from the channel. disconnect() is sync, so
            # the async unsubscribe is scheduled on the running loop.
            self.active_connections.pop(workspace_id, None)
            if workspace_id in self._subscribed:
                try:
                    asyncio.get_running_loop().create_task(self._unsubscribe(workspace_id))
                except RuntimeError:
                    logger.warning("ws_unsubscribe_no_loop", workspace_id=workspace_id)

    async def _unsubscribe(self, workspace_id: str) -> None:
        # A socket may have reconnected between scheduling and running; re-check.
        if self.active_connections.get(workspace_id):
            return
        if workspace_id not in self._subscribed:
            return
        try:
            async with self._pubsub_lock:
                await self._pubsub.unsubscribe(_channel(workspace_id))
            self._subscribed.discard(workspace_id)
            logger.info("ws_channel_unsubscribed", workspace_id=workspace_id)
        except Exception:
            logger.error("ws_unsubscribe_failed", workspace_id=workspace_id, exc_info=True)

    async def broadcast(
        self, workspace_id: str, event: dict, exclude: WebSocket | None = None
    ) -> None:
        """Publish an event to the workspace channel for all workers to relay.

        Best-effort: realtime is a side-channel, so a Redis failure is logged
        loudly (forbidden-1, never silent) but NOT propagated into the caller's
        primary operation. A task write must not 500 just because the broadcast
        could not be delivered.
        """
        payload = {
            "workspace_id": workspace_id,
            "event": event,
            # Process-local; only matched by the publishing worker (see module docstring).
            "exclude": id(exclude) if exclude is not None else None,
        }
        try:
            await self._ensure_started()
            await self._redis.publish(_channel(workspace_id), json.dumps(payload))
        except Exception:
            logger.error("ws_publish_failed", workspace_id=workspace_id, exc_info=True)

    async def _reader(self) -> None:
        """Background task: relay pub/sub messages to this worker's sockets."""
        while True:
            try:
                if not self._subscribed:
                    # Nothing to listen for yet; avoid polling a bare connection.
                    await asyncio.sleep(0.2)
                    continue
                async with self._pubsub_lock:
                    message = await self._pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=0.5
                    )
                if message is None or message.get("type") != "message":
                    continue
                await self._handle_message(message)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.error("ws_reader_error", exc_info=True)
                await asyncio.sleep(0.5)

    async def _handle_message(self, message: dict) -> None:
        try:
            payload = json.loads(message["data"])
        except (ValueError, TypeError, KeyError):
            logger.error("ws_bad_payload", channel=message.get("channel"))
            return
        workspace_id = payload.get("workspace_id")
        event = payload.get("event")
        exclude_id = payload.get("exclude")
        if workspace_id is None or event is None:
            logger.error("ws_incomplete_payload", channel=message.get("channel"))
            return
        await self._deliver_local(workspace_id, event, exclude_id)

    async def _deliver_local(
        self, workspace_id: str, event: dict, exclude_id: int | None = None
    ) -> None:
        text = json.dumps(event)
        dead: list[WebSocket] = []
        for ws in list(self.active_connections.get(workspace_id, [])):
            if exclude_id is not None and id(ws) == exclude_id:
                continue
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, workspace_id)


manager = ConnectionManager()
