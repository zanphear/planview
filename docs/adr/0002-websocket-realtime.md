# ADR 0002: WebSocket + Redis pub/sub for realtime instead of SSE

## Status
Accepted (2026-06-27)

## Context
The playbook mandates SSE for one-way progress streaming and a single-worker SQLite-backed job queue for long work. Planview uses authenticated WebSockets (`/ws/{workspace_id}` in `backend/app/main.py`) for live board/timeline edits, presence, and notifications. Background report generation runs via `app/services/report_queue.py` using `asyncio` tasks with a `Semaphore(1)` to serialise LLM calls, and persists job state on the `analysis_reports` row.

The connection registry (`app/websocket/manager.py`) is currently an in-process `defaultdict`, and `app/websocket/events.py` calls `manager.broadcast` directly. The 120rpm rate-limit middleware (`app/middleware/rate_limit.py`) is likewise in-process. Both therefore only work correctly with a single backend worker. Redis is presently used only for refresh-token JTI rotation and login attempt limiting (`app/api/auth.py`).

## Decision
Keep bidirectional WebSockets for collaborative realtime; they are the core product design, not a progress bar. Keep the report queue, but harden it.

## Consequences / follow-ups
- **Single-worker constraint.** As built, realtime fan-out and rate limiting are in-process, so the API must run as a single worker. To scale horizontally, add a Redis pub/sub backplane to `manager.py` (publish broadcasts to a workspace channel, each worker subscribes and relays to its local sockets) and move the rate-limit counters to Redis. Until then, document the single-worker deployment as supported and do not raise the worker count.
- WebSocket connections validate the JWT before `accept()` (already implemented). Keep that invariant.
- The report queue meets the spirit of "long work is observable and serialised" (status persisted, progress pushed over WS, `Semaphore(1)`), but has two gaps to close:
  1. **Crash recovery.** An in-flight report is lost on restart and left stuck in `generating`. Add a startup reconciler that marks orphaned `generating` rows as `failed`.
  2. **Job contract.** Optionally expose an HTTP 202 + job-id + poll endpoint alongside the WS push, for clients that are not connected.
- Realtime auth, reconnection, and message-shape changes are security-touching: route them through review.

## Update 2026-06-27: implemented
The Redis pub/sub backplane is now in `app/websocket/manager.py`: `broadcast`
publishes to `ws:{workspace_id}`, each worker runs one subscriber and relays to
its local sockets, and the rate limiter (`app/middleware/rate_limit.py`) uses a
Redis fixed-window counter. Broadcast failures are logged loudly but never
propagate into the primary write. The single-worker constraint is lifted in code;
verify under load before raising the worker count. The report-queue crash
reconciler remains a follow-up.
