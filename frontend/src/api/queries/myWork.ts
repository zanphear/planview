import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { timelineApi } from '../timeline';
import { milestonesApi, type Milestone } from '../milestones';
import { membersApi, type User } from '../users';
import type { Task } from '../tasks';

// The personal-timeline window is derived from the selected start date + zoom on the
// page; it keys the task list so changing zoom refetches the right slice.
export interface MyWorkWindow {
  since: string;
  until: string;
}

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one slice, a domain, or everything:
//   myWorkKeys.all                              -> ['myWork']
//   myWorkKeys.tasks(wsId, userId, window)      -> ['myWork', 'tasks', wsId, userId, window]
//   myWorkKeys.milestones(wsId)                 -> ['myWork', 'milestones', wsId]
//   myWorkKeys.members(wsId)                    -> ['myWork', 'members', wsId]
export const myWorkKeys = {
  all: ['myWork'] as const,
  tasks: (workspaceId: string, userId: string, window: MyWorkWindow) =>
    [...myWorkKeys.all, 'tasks', workspaceId, userId, window] as const,
  milestones: (workspaceId: string) => [...myWorkKeys.all, 'milestones', workspaceId] as const,
  members: (workspaceId: string) => [...myWorkKeys.all, 'members', workspaceId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/** Current user's tasks across all projects within a date window (the personal timeline). */
export function useMyTasks(
  workspaceId: string | undefined,
  userId: string | undefined,
  window: MyWorkWindow,
) {
  return useQuery({
    queryKey: myWorkKeys.tasks(workspaceId ?? '', userId ?? '', window),
    queryFn: async (): Promise<Task[]> =>
      (
        await timelineApi.get(workspaceId!, {
          since: window.since,
          until: window.until,
          users: userId!,
        })
      ).data,
    enabled: !!workspaceId && !!userId,
  });
}

/** Workspace milestones rendered as markers on the timeline. */
export function useMyWorkMilestones(workspaceId: string | undefined) {
  return useQuery({
    queryKey: myWorkKeys.milestones(workspaceId ?? ''),
    queryFn: async (): Promise<Milestone[]> => (await milestonesApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Workspace members — used to resolve assignees in the task detail panel. */
export function useMyWorkMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: myWorkKeys.members(workspaceId ?? ''),
    queryFn: async (): Promise<User[]> => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/**
 * Adapter exposing the personal-timeline task cache as a React-style state setter.
 * The existing realtime + context-action hooks expect `Dispatch<SetStateAction<Task[]>>`
 * (they predate TanStack Query); this routes their updates straight into the query
 * cache so the cache stays the single source of truth for `tasks`.
 */
export function useSetMyTasks(
  workspaceId: string | undefined,
  userId: string | undefined,
  window: MyWorkWindow,
): Dispatch<SetStateAction<Task[]>> {
  const qc = useQueryClient();
  return useCallback<Dispatch<SetStateAction<Task[]>>>(
    (update) => {
      qc.setQueryData<Task[]>(myWorkKeys.tasks(workspaceId ?? '', userId ?? '', window), (old) => {
        const prev = old ?? [];
        return typeof update === 'function' ? (update as (p: Task[]) => Task[])(prev) : update;
      });
    },
    [qc, workspaceId, userId, window],
  );
}
