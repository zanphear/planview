# ADR 0005: Introduce a repository layer (strangler-fig)

## Status
Accepted, in progress (2026-06-27)

## Context
The backend standard is three layers: thin router (wiring + one service call) -> service (logic, no FastAPI imports, domain errors) -> repository (all DB access). Planview today has fat routers that run SQLAlchemy queries directly (`api/tasks.py`, `api/people.py`, `api/auth.py`), partial services, and no `repositories/` package. `services/analysis_service.py` mixes DB access, prompt building, and LLM HTTP in one 900-line module. The one clean part: services do not import FastAPI or raise `HTTPException` (verified zero).

## Decision
Adopt a repository layer incrementally with a strangler-fig, one aggregate at a time, never a big-bang rewrite (forbidden-21). Pin current behaviour with characterization tests over the seam before moving each aggregate.

## Plan
1. Create `app/repositories/` with one module per aggregate (tasks, projects, people, ...). Repositories take an `AsyncSession` via `Depends` and own all `select`/`add`/`delete`.
2. Start with the fattest, highest-traffic router (`tasks.py`): extract `TaskService` (create/update/recurrence orchestration) and `TaskRepository`. Router becomes wiring + one call.
3. Split `analysis_service.py` into pure logic (prompt/parse), an LLM client, and a repository for context-gathering, with an orchestrator wiring them.
4. Inject the clock into recurrence/report logic so timestamps and occurrence dates are deterministic and testable (forbidden-18).
5. One aggregate per PR, with a build + test between each.

## Consequences
- Large, multi-PR effort. The app keeps working throughout; each PR is independently shippable.
- Pairs naturally with the test-coverage rollout (ADR 0007): characterization tests written before each extraction become the permanent integration tests.

## Update 2026-06-27: base + first aggregate landed
`app/repositories/base.py` (`WorkspaceRepository`) is in place and the teams
aggregate is migrated to thin router -> `TeamService` -> `TeamRepository` as the
template, behaviour-preserving. The service raises local domain errors (no FastAPI
imports) which the router maps to HTTP. Remaining aggregates (tasks, projects,
people, the analysis_service split) follow the same pattern, one per PR.
