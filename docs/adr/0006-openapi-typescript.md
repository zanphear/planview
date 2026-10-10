# ADR 0006: Generate frontend types from the OpenAPI schema

## Status
Accepted, in progress (2026-06-27)

## Context
Forbidden-43: no hand-written types across the API seam; generate TS from the FastAPI OpenAPI schema and fail CI on drift. Planview currently hand-writes response interfaces in each `src/api/*.ts` (264 routes typed by hand on both sides), which drift silently from the backend Pydantic schemas.

## Decision
Adopt `openapi-typescript` to generate `src/api/schema.ts` from the backend OpenAPI document, and migrate the hand-written fetcher types to the generated types over time. Add a CI drift gate once the generated types are consumed.

## What landed now
- `openapi-typescript` added to `frontend/package.json` devDependencies.
- `npm run gen:api` script: `openapi-typescript ../backend/openapi.json -o src/api/schema.ts`.
- `src/api/schema.ts` is gitignored from Prettier formatting (generated artifact).

## Plan (deferred)
1. Add a backend make target that dumps the OpenAPI document without booting a server: `python -c "import json, app.main; json.dump(app.main.app.openapi(), open('openapi.json','w'))"`.
2. Generate and commit `schema.ts`.
3. Migrate `api/*.ts` fetchers to reference the generated `components["schemas"][...]` types instead of hand-written interfaces.
4. Add a CI job that regenerates against the test-booted app and runs `git diff --exit-code src/api/schema.ts`, failing on drift.

## Consequences
- Until step 4, the gate is not enforced; the tooling is in place so the migration is mechanical.
