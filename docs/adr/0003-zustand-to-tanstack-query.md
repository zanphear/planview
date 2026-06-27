# ADR 0003: Migrate frontend server state from Zustand to TanStack Query

## Status
Accepted, in progress (2026-06-27)

## Context
Forbidden-5: fetched server data must live in TanStack Query only; client state stays local. Planview currently holds server data in Zustand stores and, more often, in ad-hoc `useState` + `useEffect` + `.catch()` across roughly 48 page/component files. `@tanstack/react-query` is already installed but unused. The hand-rolled pattern produces real silent-failure bugs: `.catch(() => setLoading(false))` leaves the UI on a permanent skeleton with no error or retry.

A stop-the-world rewrite is itself a forbidden pattern (forbidden-21: no big-bang rewrite of a live module). The typed axios fetcher layer (`src/api/*.ts`, one client, no `any` on boundaries) is clean and is about 60% of a normal migration already done; Query hooks wrap the existing fetchers.

## Decision
Migrate incrementally, store-by-store and page-by-page, behind the existing typed fetchers. Until a slice is migrated it stays as-is, but no NEW server-state Zustand stores or `useState`-of-fetched-data may be added.

`uiStore` (sidebar, zoom, dark mode), `authStore` token/`isAuthenticated`, and `notificationStore.isOpen` are genuine client state and stay in Zustand.

## Plan
1. Foundation: add `QueryClientProvider` + sane defaults in `App.tsx`; one shared `Skeleton`/`ErrorState`/`EmptyState` trio.
2. Pilot: convert `projectStore` + `taskStore` + `ProjectBoardPage` (key factory, four states, optimistic + rollback). This becomes the template.
3. Server stores: migrate `lookupStore`, `workspaceStore` (highest fan-out) then `teamStore`, `peopleStore`, `notificationStore`, `authStore.user`; delete the stores.
4. Direct-fetch pages: the ~48 `useEffect`-into-`useState` surfaces, batched by area. This is where the silent-failure bugs get fixed.
5. Guard: an ESLint rule banning `useState` of fetched data and new server-state Zustand stores, so it cannot regress.

## Consequences
- Realistic effort: large (about 5 to 8 focused days), but each phase ships independently.
- Until complete, the codebase carries both patterns; that is acceptable under the strangler-fig approach.
