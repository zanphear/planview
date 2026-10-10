import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dependenciesApi, type TaskDependency } from '../dependencies';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. The endpoint is workspace-scoped but filtered by task_id, so we key
// the list by taskId. A mutation touches two tasks (blocker + blocked), so writes
// invalidate the whole dependency domain rather than a single task's key:
//   dependencyKeys.all                       -> ['dependencies']
//   dependencyKeys.lists()                   -> ['dependencies', 'list']
//   dependencyKeys.byTask(wsId, taskId)      -> ['dependencies', 'list', wsId, taskId]
export const dependencyKeys = {
  all: ['dependencies'] as const,
  lists: () => [...dependencyKeys.all, 'list'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...dependencyKeys.lists(), workspaceId, taskId] as const,
};

type CreateDependencyInput = Parameters<typeof dependenciesApi.create>[1];

interface RollbackContext {
  previous: TaskDependency[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Dependencies (blockers + blocking) for a single task. */
export function useTaskDependencies(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: dependencyKeys.byTask(workspaceId ?? '', taskId ?? ''),
    queryFn: async (): Promise<TaskDependency[]> =>
      (await dependenciesApi.list(workspaceId!, taskId!)).data,
    enabled: !!workspaceId && !!taskId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a dependency. Can reject (cycle / duplicate), so callers surface the
 * error. Invalidates every dependency list (both linked tasks are affected).
 */
export function useCreateDependency(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDependencyInput): Promise<TaskDependency> =>
      (await dependenciesApi.create(workspaceId!, data)).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dependencyKeys.lists() });
    },
  });
}

/** Delete a dependency with an optimistic remove from the task's list + rollback. */
export function useDeleteDependency(workspaceId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient();
  const key = dependencyKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (dependencyId: string) => {
      await dependenciesApi.delete(workspaceId!, dependencyId);
      return dependencyId;
    },
    onMutate: async (dependencyId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TaskDependency[]>(key);
      qc.setQueryData<TaskDependency[]>(key, (old) =>
        old ? old.filter((d) => d.id !== dependencyId) : old,
      );
      return { previous };
    },
    onError: (_err, _dependencyId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dependencyKeys.lists() });
    },
  });
}
