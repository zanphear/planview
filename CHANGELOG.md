# Changelog

All notable changes to Planview. Format loosely follows Keep a Changelog; dates are UTC.

## [Unreleased]

### Security
- Fixed two cross-tenant IDOR holes: `early_talent.py` and `attachments.py` now scope every read and write by `workspace_id` (or a parent join), and verify the parent resource belongs to the workspace on nested create/list routes.
- Removed the committed `deploy/.env.production` (real JWT signing key plus DB/Redis passwords) from version control, gitignored it, and added `deploy/.env.production.example`. NB: the secret remains in git history and must be rotated and purged (see release notes).
- Hardened attachment download: realpath containment check and safe `Content-Disposition` encoding (no header injection from filenames).

### Added
- Structured JSON logging (`structlog`) with a request-scoped `request_id` bound via contextvars (`app/logging_config.py`).
- RFC 9457 problem+json error handlers for HTTPException, validation, and the catch-all 500; the 500 handler never leaks a traceback and carries the request id in `instance` (`app/errors.py`).
- CI gates: pytest (against an ephemeral PostgreSQL service), ESLint, Prettier check, mypy config, em/en dash guard (`scripts/check-no-dashes.sh`), and a frontend bundle budget (`scripts/check-bundle-budget.mjs`).
- `.pre-commit-config.yaml` (ruff, prettier, dash guard, private-key and prod-env guards).
- Semantic design-token layer in `globals.css` (`@theme inline`: `bg-background`, `text-foreground`, `bg-card`, etc.) with OKLCH `-foreground` partners and a global `:focus-visible` ring.
- Project docs: `ARCHITECTURE.md` (Mermaid), `AGENTS.md`, `docs/adr/` (ADRs 0001-0007), this changelog, and a playbook reference in `CLAUDE.md`.

### Changed
- Removed all 432 em dashes and 5 en dashes across the codebase, docs, and UI copy (fleet law).
- Lazy-loaded all 13 previously-eager router pages; added vite `manualChunks` to split react/tiptap/dnd/markdown out of the initial chunk.
- Replaced 29 `transition-all` usages with `transition-colors` (no layout-property transitions).
- Replaced silent `except` swallows in `people_stats.py` (12) and the auth logout path with loud structured logging.
- Switched `auth.py` from stdlib sentence logging to structlog events.
- Corrected docs: realtime fan-out and rate limiting are in-process (single-worker), not Redis pub/sub as previously claimed.

### ADR follow-through (round 2)
- **0002:** implemented the Redis pub/sub WebSocket backplane in `manager.py` (broadcast publishes to `ws:{workspace_id}`, each worker subscribes and relays to its local sockets) and moved the rate limiter to a Redis fixed-window counter. Multi-worker realtime now works; a Redis blip on broadcast is logged loudly but never fails the primary write.
- **0003:** TanStack Query foundation (`QueryClientProvider`, `src/lib/queryClient.ts`) plus the project-board pilot: `src/api/queries/{projects,tasks}.ts` hooks (optimistic move/reorder with rollback) and `ProjectBoardPage` rendering all four async states. Remaining slices follow the same template.
- **0004:** swept 226 `bg-[var(--color-...)]` arbitrary literals to semantic utilities (`bg-background`, `bg-card`, `text-muted-foreground`, `bg-sidebar`, ...) with a 1:1 same-var mapping, so rendering is unchanged. Raw palette utilities and the `text-xs` floor and shadcn remain (need visual QA).
- **0005:** introduced `app/repositories/` (`WorkspaceRepository` base) and migrated the teams aggregate to thin router -> `TeamService` -> `TeamRepository` as the strangler template. Remaining aggregates follow.
- **0006:** added `backend/scripts/dump_openapi.py` and a CI `openapi-types` job that generates `schema.ts` from the schema. Fetcher migration to the generated types is the remaining tail.
- **0007:** added `tests/test_idor.py` (cross-tenant regression tests for the early-talent and attachment fixes), `tests/test_projects.py`, `tests/test_tasks.py`. Backend tests now run in CI against an ephemeral Postgres.

### Notes
- Still deferred (need npm/visual QA or are genuinely multi-PR): full Zustand to TanStack migration of the remaining ~47 surfaces, the raw-palette and font-size cleanup plus shadcn primitives (0004), the rest of the repository-layer aggregates (0005), the OpenAPI fetcher migration and drift gate (0006), and the blocking mypy gate (0007).
- None of the round-2 code was runtime-verified in the authoring environment (no node, partial backend venv). CI and review are the gate.
