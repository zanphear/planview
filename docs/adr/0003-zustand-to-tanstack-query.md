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

## Update 2026-06-27: foundation + pilot landed
`QueryClientProvider` and `src/lib/queryClient.ts` are wired. The project-board
slice is migrated as the template: `src/api/queries/{projects,tasks}.ts` wrap the
existing typed fetchers with query-key factories and mutations (optimistic
move/reorder with onError rollback), and `ProjectBoardPage` renders all four
states. The Zustand stores remain for other consumers; `Board.tsx` is bridged
one-way from the Query cache until it is migrated. Steps 3 to 5 (remaining stores,
the ~47 direct-fetch pages, the ESLint guard) are the remaining work.

## Update 2026-06-28: migration substantially complete
All ~25 fetch-into-useState surfaces are migrated to TanStack Query across three
verified waves: the people-management pages (Leave, Compliance, Reviews,
Recruitment, Development, Objectives, Competencies, Wellbeing, Onboarding, Rota,
Resource, Absence, Activity), the dashboards (Dashboard, Reporting, Burndown),
MyWork, SettingsPage (six data sections), the task-detail component subtree
(comments, attachments, tags, dependencies, checklists, with optimistic add/delete
and rollback), and the global Taskbox/QuickSearch/OIDC callback. Each page renders
the four async states; mutations invalidate query keys. `set-state-in-effect`
dropped from 22 to 0 violations and is now a CI-blocking error (the few remaining
genuine UI-sync effects carry a reasoned eslint-disable), so the pattern cannot
regress (step 5 of the plan).

Remaining tidy-up: the Zustand server-data stores (projectStore, taskStore,
teamStore, peopleStore, lookupStore) still exist for backward compatibility and the
Board.tsx one-way bridge; they can be deleted once their last consumers are moved
to hooks. workspaceStore/authStore/uiStore stay (genuine client state). Verified
locally: frontend build + lint (0 errors) + format all green.

## Update 2026-06-28: first server store deleted
PeoplePage is migrated and `peopleStore` is deleted (no other consumers). The
remaining server-data stores (project/task/team/lookup/notification) are still
read by the timeline, board and sidebar surfaces, several of which are coupled to
the realtime `useRealtimeTasks` bridge (WebSocket task updates write to the store).
Deleting those safely means rewiring the realtime bridge to the query cache, which
needs a running app to verify, so they are the documented remainder.
