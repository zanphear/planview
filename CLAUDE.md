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
| Auth | JWT (PyJWT + passlib[bcrypt]) + optional OIDC |
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
4. **COMPLETE** — Real-time & Collaboration — WebSocket (authenticated), comments, notifications
5. **COMPLETE** — Polish & Extended Features — Attachments, recurring, import/export, sharing
6. **COMPLETE** — Hardening & Release — Security hardening, container hardening, Docker Hub push

## Current Status
Full-featured people management platform with 250+ API routes. Security hardened for
external exposure (IDOR guard, JWT secret validation, WebSocket auth, path traversal
fixes, CSP/security headers, Redis auth, refresh token rotation with JTI, OIDC nonce
validation, login rate limiting, MIME validation, non-root containers, resource limits).
20 Alembic migrations. TypeScript builds clean.

## Security Model
- **Workspace IDOR guard**: `get_workspace_user` dependency validates user belongs to workspace
- **JWT secret**: Backend refuses to start with default secret
- **WebSocket auth**: Requires `?token=xxx` query param, validated before accept
- **Refresh token rotation**: JTI claim stored in Redis, one-time use, revocable via logout
- **Login rate limiting**: 5 attempts per email per 15 minutes (Redis-backed)
- **OIDC nonce**: Prevents ID token replay attacks
- **Path traversal**: `os.path.basename()` + `os.path.realpath()` bounds checks on file serving
- **CSP headers**: `default-src 'self'`, `frame-ancestors 'none'` via nginx
- **File uploads**: Magic byte validation (python-magic), forced `Content-Disposition: attachment`
- **Swagger**: Disabled by default (`ENABLE_DOCS=false`), blocked in nginx
- **Containers**: Non-root (appuser / nginx-unprivileged), pinned image versions, resource limits
- **Redis**: Password-protected (`--requirepass`)

## Anti-Patterns to Avoid
- Don't let this file exceed 100 lines — detail goes in docs/
- Don't put business logic in route handlers
- Don't skip Alembic — even for "quick" schema changes
- Don't build React components monolithically — one component per file
- Don't hardcode config — everything via pydantic-settings + env vars
- Don't skip verification between phases — test each phase works before moving on
