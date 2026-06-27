# Planview: Project Context

## What Is This
A self-hosted visual planning & scheduling tool modelled on Toggl Plan (formerly Teamweek). Drag-and-drop timeline-based project planning with team swimlanes, Kanban boards, real-time collaboration, and a full people-management suite.

## Engineering Standards
This project follows Bill's Engineering Playbook at `~/.claude/playbook/`. Read it before writing code. The numbered docs are prescriptive; follow them unless an ADR below overrides a rule (and says why).

- Fleet law (forbidden patterns are binding): @~/.claude/playbook/standards/STANDARDS.md
- Agentic-development rules: @~/.claude/playbook/agentic/README.md
- Tool-agnostic agent contract: @AGENTS.md

Accepted deviations and migration plans live in `docs/adr/`. The playbook wins by default; deviate only in writing.

## Repository
- **GitHub:** github.com/zanphear/planview
- **Docker Hub:** wgf007/planview (`planview-api`, `planview-ui`)
- **Deployment:** bill@lxc-testbed, Dockge stack `/files/appdata/config/dockge/stacks/planview`

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.12, async everywhere |
| ORM / DB | SQLAlchemy 2.0 async + asyncpg, PostgreSQL 16 |
| Migrations | Alembic (async, manual) |
| Redis 7 | Refresh-token JTI rotation + login rate limiting (`auth.py`) |
| Observability | structlog JSON + request_id contextvar, RFC 9457 problem+json |
| Frontend | React 19 + TypeScript + Vite 7, Tailwind v4 |
| State | Zustand 5 (migration to TanStack Query planned, ADR 0003) |
| DnD / Rich text | @dnd-kit, TipTap |
| Auth | JWT (PyJWT + passlib[bcrypt]) + optional OIDC |
| Proxy / Deploy | Nginx, Docker Compose |

## Architecture Rules (Non-Negotiable)
1. PostgreSQL is the single source of truth
2. Alembic migrations for every schema change, no raw DDL, single-owner and serial
3. UUID primary keys with `server_default=text("gen_random_uuid()")`
4. Async everywhere: async engine, async sessions, async routes
5. Pydantic v2 schemas for all request/response validation
6. Business logic belongs in `services/`, not route handlers (ADR 0005 tracks the repository-layer rollout)
7. Real-time updates broadcast over WebSocket via a Redis pub/sub backplane (`manager.py`); rate limiting is Redis-backed too, so multi-worker is supported (ADR 0002, verify under load before raising worker count)
8. Every query scoped by `workspace_id`; never trust an id from the path alone (IDOR guard)
9. All timestamps UTC with timezone awareness
10. No em dashes or en dashes anywhere (enforced by `scripts/check-no-dashes.sh` in CI + pre-commit)

## Observability & Errors
- `app/logging_config.py`: structlog JSON, `request_id_var` contextvar bound in middleware
- `app/errors.py`: RFC 9457 problem+json handlers (HTTPException, validation, catch-all 500). The 500 handler never leaks a traceback; the id rides in `instance`.

## Security Model
- **Workspace IDOR guard**: `get_workspace_user` proves the caller is in the URL workspace; every resource query must ALSO scope by `workspace_id` (or join its parent). See `attachments.py`, `early_talent.py` for the pattern.
- JWT secret validated at startup; WebSocket auth before accept; refresh rotation (JTI in Redis); login rate limiting; OIDC nonce; path-traversal realpath bounds; CSP headers; magic-byte upload validation; non-root containers.
- Production secrets live ONLY in `deploy/.env.production` (gitignored). Template: `deploy/.env.production.example`.

## Key Design Docs
- `ARCHITECTURE.md`: Mermaid diagrams of the system, layering, realtime, auth, data model
- `docs/design-spec.md`, `docs/implementation-plan.md`: feature spec and phased build
- `docs/adr/`: architectural decisions and accepted deviations

## Tooling
- Backend: `ruff` (lint + format), `mypy`, `pytest` (httpx AsyncClient + ASGITransport). Config in `backend/pyproject.toml`.
- Frontend: `eslint`, `prettier` (separate steps), `tsc -b`, bundle budget (`scripts/check-bundle-budget.mjs`).
- `.pre-commit-config.yaml` + `.github/workflows/ci.yml` run both. `npm run gen:api` regenerates TS types from the OpenAPI schema (ADR 0006).

## Anti-Patterns to Avoid
- Don't let this file exceed ~100 lines; detail goes in docs/
- Don't put business logic in route handlers; don't skip Alembic
- Don't swallow exceptions silently; surface to logs (structlog) and the user
- Don't add raw palette/hex in `*.tsx`; use semantic tokens (ADR 0004)
- Don't build React components monolithically; one component per file
- Don't hardcode config or secrets; everything via pydantic-settings + env vars
