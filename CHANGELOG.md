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

### Notes
- Several large items are recorded as ADRs with phased plans rather than done in one pass: Zustand to TanStack Query (0003), OKLCH/literal sweep and shadcn (0004), repository layer (0005), OpenAPI to TS (0006), mypy gate and test coverage (0007).
