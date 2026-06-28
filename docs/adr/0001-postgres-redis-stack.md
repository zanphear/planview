# ADR 0001: PostgreSQL + SQLAlchemy + Redis instead of the SQLite fleet default

## Status
Accepted (2026-06-27)

## Context
The fleet Engineering Playbook targets a fixed stack: Python + FastAPI over SQLite/sqlite-vec, a single-worker in-process background queue, and explicitly no Redis/Celery/RabbitMQ. Planview was built on PostgreSQL 16 + SQLAlchemy 2.0 async + asyncpg, with Redis 7 (today used for refresh-token JTI rotation and login rate limiting; the intended home for the realtime pub/sub backplane, see ADR 0002).

Planview is a multi-user, real-time collaborative planning tool with concurrent writers across team swimlanes, live presence, and a people-management suite spanning roughly 45 tables. That workload is a poor fit for single-writer SQLite: it needs concurrent connection pooling, JSONB columns, `gen_random_uuid()` server defaults, and cross-process pub/sub for WebSocket fan-out across multiple workers.

## Decision
Keep PostgreSQL + SQLAlchemy async + Redis. Do not migrate to SQLite. This is a deliberate, permanent deviation from the fleet default stack.

The stack-agnostic principles of the playbook still apply in full and are NOT waived: thin routers, services without FastAPI imports, scoped reads/writes, RFC 9457 errors, structlog with a bound request_id, no silent failures, append-only single-owner migrations, no client-chosen SQL identifiers.

## Consequences
- The fleet "no Redis" and "SQLite job queue" rules are N/A here; the equivalent guarantees (observable long work, serial execution) are met differently (see ADR 0002 and the report queue).
- Tests run against an ephemeral PostgreSQL service in CI rather than in-memory SQLite, because the models use Postgres-specific features (`gen_random_uuid`, JSONB).
- This ADR should feed a fleet-standards proposal to recognise a "Postgres + realtime collaborative SPA" stack variant as first-class, the way the server-rendered htmx variant already is.
