# Planview — Project Context

## What Is This
A self-hosted visual planning & scheduling tool modelled on Toggl Plan (formerly Teamweek). Drag-and-drop timeline-based project planning with team swimlanes, Kanban boards, and real-time collaboration.

## Repository
- **GitHub:** github.com/zanphear/planview
- **Docker Hub:** wgf007/planview
- **Source (dev):** ~/projects/planview (WSL)
- **Deployment:** bill@lxc-testbed:/files/appdata/config/planview
- **Dockge stack:** /files/appdata/config/dockge/stacks/planview

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.12 |
| ORM | SQLAlchemy 2.0 (async) + asyncpg |
| Migrations | Alembic (async) |
| Database | PostgreSQL 16 |
| Cache/Pubsub | Redis 7 |
| Frontend | React 19 + TypeScript + Vite 6 |
| State | Zustand 5 |
| DnD | @dnd-kit/core 6 |
| Rich Text | TipTap 2 |
| CSS | Tailwind CSS 4 |
| Auth | JWT (PyJWT + passlib[bcrypt]) |
| File Storage | Local fs (MinIO optional later) |
| Reverse Proxy | Nginx |
| Container | Docker Compose |

## Architecture Rules (Non-Negotiable)
1. PostgreSQL is the single source of truth
2. Alembic migrations for every schema change — no raw DDL
3. UUID primary keys with `server_default=text("gen_random_uuid()")`
4. Async everywhere — async engine, async sessions, async routes
5. Pydantic v2 schemas for all request/response validation
6. Business logic in `services/` layer, not in route handlers
7. WebSocket via Redis pub/sub for real-time updates
8. Frontend: Zustand stores, no prop drilling, API client layer
9. All timestamps UTC with timezone awareness

## Key Design Docs
- `docs/design-spec.md` — Full feature spec, data model, UI components, interactions
- `docs/implementation-plan.md` — Repo structure, phased build plan, tech stack

## Build Phases
1. **COMPLETE** — Foundation: API skeleton, DB schema, auth, frontend shell, Docker
2. **COMPLETE** — Projects & Tasks CRUD: Board view with DnD, TaskDetail panel
3. **COMPLETE** — Timeline Views: Team/Project/MyWork timelines with zoom + task bars
4. Real-time & Collaboration — WebSocket, comments, notifications
5. Polish & Extended Features — Attachments, recurring, import/export, sharing
6. Hardening & Release — Error handling, perf, CI, Docker Hub push

## Current Status
Phases 1-3 code complete. Docker Desktop not running on Windows host — `docker compose up`
not yet tested. All Python imports verified, TypeScript builds clean. 27 unique API paths,
50+ route handlers. Next: Phase 4 (WebSocket + comments).

## Anti-Patterns to Avoid
- Don't let this file exceed 100 lines — detail goes in docs/
- Don't put business logic in route handlers
- Don't skip Alembic — even for "quick" schema changes
- Don't build React components monolithically — one component per file
- Don't hardcode config — everything via pydantic-settings + env vars
- Don't skip verification between phases — test each phase works before moving on
