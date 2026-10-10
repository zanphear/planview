# AGENTS.md: Planview

Tool-agnostic contract for any coding agent (Claude Code, Codex, Cursor, Aider) working in this repo. `CLAUDE.md` imports this file; both are the binding context.

## Read first
- Fleet law (binding forbidden patterns): `~/.claude/playbook/standards/STANDARDS.md`
- Project overview, stack, security model: `CLAUDE.md`
- How the system fits together: `ARCHITECTURE.md`
- Accepted deviations and migration plans: `docs/adr/`

## Stack (do not re-platform without an ADR)
FastAPI + Python 3.12 async, SQLAlchemy 2.0 + asyncpg, PostgreSQL 16, Redis 7, Alembic. React 19 + TypeScript + Vite + Tailwind v4, Zustand. JWT/OIDC auth. Nginx + Docker Compose.

This deviates from the SQLite/no-Redis fleet default on purpose: Planview is a multi-worker, real-time collaborative app. The deviation is recorded in `docs/adr/0001` and `docs/adr/0002`; do not "fix" it back to SQLite.

## Non-negotiables specific to this repo
1. **Workspace scoping.** Every DB read/write is scoped by `workspace_id`. `get_workspace_user` only proves the caller belongs to the URL workspace; you must also filter the resource by `workspace_id` or join its parent. Cross-tenant access is a security bug.
2. **Migrations are append-only and single-owner.** One Alembic migration per change, serial, never two agents authoring migrations in parallel.
3. **No business logic in route handlers** beyond wiring + one service call. Services raise domain errors, never import FastAPI. (Repository-layer rollout: `docs/adr/0005`.)
4. **No silent failures.** Surface to structlog (`app/logging_config.py`) and to the user; never swallow an exception or return a silent default.
5. **Errors are RFC 9457 problem+json** via `app/errors.py`; the 500 handler never leaks a traceback.
6. **No em dashes or en dashes anywhere.** Enforced by `scripts/check-no-dashes.sh` (pre-commit + CI). Use commas, colons, parentheses, or split the sentence.
7. **No secrets in git.** `deploy/.env.production` is gitignored; use `.env.production.example` as the template.
8. **Frontend server state** is being migrated to TanStack Query (`docs/adr/0003`). Do not add new Zustand stores that hold fetched server data; new data-fetching surfaces should use `@tanstack/react-query`.
9. **Semantic design tokens** only in new `*.tsx` (`bg-background`, `text-foreground`, `bg-card`, etc., defined in `src/styles/globals.css`). Do not add raw hex or `bg-gray-*` (`docs/adr/0004`).
10. **Every route is `React.lazy`**; keep the CI bundle budget green (`scripts/check-bundle-budget.mjs`).

## Verify before you claim done
- Backend: `cd backend && ruff check app/ && ruff format --check app/ && pytest -q`
- Frontend: `cd frontend && npm run lint && npm run format:check && npm run build`
- Repo: `./scripts/check-no-dashes.sh`
- CI runs all of the above plus a Postgres-backed test job and the bundle budget.

## Commits
Conventional Commits, one logical change per commit, no bundling a refactor with a feature. Keep the global commit trailer verbatim. No generic subjects (`fix bug`, `wip`, `updates`).
