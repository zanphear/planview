# ADR 0007: Type-checking (mypy) and test-coverage rollout

## Status
Accepted, in progress (2026-06-27)

## Context
Forbidden-30: no type error as warn-only; strict everywhere. Forbidden-22/24/25 and the Test Trophy: bulk integration tests over the seam, real DB fixtures, `httpx.AsyncClient`. The audit found: no backend type-checker at all, and 26 test functions covering roughly 5% of 264 routes, with no frontend tests and no Playwright. The frontend already type-checks via `tsc -b` (strict) in the build.

## Decision
Roll both out incrementally rather than flipping a strict gate that is red on day one (which is unmergeable and therefore worse than no gate).

## What landed now
- `mypy` added to backend dev deps with a pragmatic `[tool.mypy]` config (`check_untyped_defs`, `ignore_missing_imports`, alembic/tests excluded). It is in pre-commit but NOT yet a blocking CI gate.
- `pytest` is now actually run in CI against an ephemeral PostgreSQL service (it previously existed but was never executed).
- `conftest.py` reads a dedicated `TEST_DATABASE_URL` so tests never touch the configured prod DB.
- `pytest-cov` added for coverage measurement.

## Plan (deferred)
1. **Type-checking:** fix the mypy findings module by module, starting with `services/` and `api/`, then promote `mypy app/` to a blocking CI job. Ratchet config toward `disallow_untyped_defs` per package as each is cleaned.
2. **Backend tests:** add integration tests over the high-value routers (projects, tasks, people, leave, compliance, attachments, early-talent, the IDOR fixes) using the existing `httpx.AsyncClient` fixture. Target the seam, not 100%. Improve `conftest` isolation toward a fresh DB per test.
3. **Frontend tests:** stand up Vitest + React Testing Library + MSW; query by role/label, drive with `user-event`; assert on the contract.
4. **E2E:** 3 to 5 Playwright journeys (login, create project, board DnD, timeline, file upload) as a separate slower CI stage.
5. Set a coverage guardrail around 70 to 80% on services, excluding migrations and generated code.

## Consequences
- CI now runs the existing tests (real signal) instead of silently never running them. The deeper coverage and the blocking mypy gate are staged follow-ups.

## Update 2026-06-28: mypy gate is live
mypy is clean across all 153 source files and now runs as a blocking CI job
(backend-lint installs the dev extras + libmagic and runs `mypy app/`). The first
pass fixed 40 errors, several of them genuine runtime bugs the gate caught: the
burndown series in `stats.py` was built from `r.count` (the tuple method, not the
column) and would have crashed; `export_service` called string `.replace` on a
date column; two routers reused a `result` variable across queries of different
models. Broader integration test coverage and per-package strictness ratcheting
remain the follow-on.
