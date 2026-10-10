# Architecture Decision Records

ADRs record significant architectural decisions, especially where Planview deviates from Bill's fleet Engineering Playbook (`~/.claude/playbook/`). The playbook wins by default; every deviation must be recorded here with its rationale.

ADRs are append-only. A changed decision is a NEW ADR that supersedes the old one, linked both ways (forbidden-35). Never edit an accepted ADR in place except to mark it superseded.

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | PostgreSQL + SQLAlchemy + Redis instead of the SQLite fleet default | Accepted |
| 0002 | WebSocket + Redis pub/sub for realtime instead of SSE | Accepted |
| 0003 | Migrate frontend server state from Zustand to TanStack Query | Accepted, in progress |
| 0004 | Design tokens: OKLCH semantic layer and styling cleanup | Accepted, in progress |
| 0005 | Introduce a repository layer (strangler-fig) | Accepted, in progress |
| 0006 | Generate frontend types from the OpenAPI schema | Accepted, in progress |
| 0007 | Type-checking (mypy) and test-coverage rollout | Accepted, in progress |
