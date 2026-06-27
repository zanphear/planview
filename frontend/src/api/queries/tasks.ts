import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi, type Task } from '../tasks';

// ── Query key factory ────────────────────────────────────────────────────────
// Hierarchical so we can invalidate one list, all lists, or everything:
//   taskKeys.all                          -> ['tasks']
//   taskKeys.lists()                      -> ['tasks', 'list']
//   taskKeys.list(wsId, params)           -> ['tasks', 'list', wsId, params]
//   taskKeys.byProject(wsId, projectId)   -> list keyed on { project_id }
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (workspaceId: string, params: Record<string, string>) =>
    [...taskKeys.lists(), workspaceId, params] as const,
  byProject: (workspaceId: string, projectId: string) =>
    taskKeys.list(workspaceId, { project_id: projectId }),
};

type CreateTaskInput = Parameters<typeof tasksApi.create>[1];
type UpdateTaskInput = Parameters<typeof tasksApi.update>[2];
type BulkUpdateInput = Parameters<typeof tasksApi.bulkUpdate>[1];
type ReorderItems = Parameters<typeof tasksApi.reorder>[1];

interface RollbackContext {
  previous: Task[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** All tasks for a project (the board's primary server data). */
export function useProjectTasks(workspaceId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.byProject(workspaceId ?? '', projectId ?? ''),
    queryFn: async () => (await tasksApi.list(workspaceId!, { project_id: projectId! })).data,
    enabled: !!workspaceId && !!projectId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a task, then append to the project list cache and revalidate. */
export function useCreateTask(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => (await tasksApi.create(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<Task[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Update a single task; merge the server result into the list cache. */
export function useUpdateTask(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (vars: { taskId: string; data: UpdateTaskInput }) =>
      (await tasksApi.update(workspaceId!, vars.taskId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<Task[]>(key, (old) =>
        old ? old.map((t) => (t.id === updated.id ? updated : t)) : old,
      );
    },
  });
}

/** Bulk status / assignee change; merge every returned task into the cache. */
export function useBulkUpdateTasks(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (data: BulkUpdateInput) =>
      (await tasksApi.bulkUpdate(workspaceId!, data)).data,
    onSuccess: (updatedList) => {
      qc.setQueryData<Task[]>(key, (old) =>
        old ? old.map((t) => updatedList.find((u) => u.id === t.id) ?? t) : old,
      );
    },
  });
}

/** Delete a task with an optimistic remove + rollback on error. */
export function useDeleteTask(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (taskId: string) => {
      await tasksApi.delete(workspaceId!, taskId);
      return taskId;
    },
    onMutate: async (taskId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) => (old ? old.filter((t) => t.id !== taskId) : old));
      return { previous };
    },
    onError: (_err, _taskId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Move a task to a new status / sort position. OPTIMISTIC: snapshot the cache,
 * patch the task in place on `onMutate`, ROLL BACK to the snapshot on error,
 * revalidate on settle. (ADR forbidden-6: optimistic moves must roll back.)
 */
export function useMoveTask(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (vars: { taskId: string; status: string; sort_order: number }) =>
      (
        await tasksApi.update(workspaceId!, vars.taskId, {
          status: vars.status,
          sort_order: vars.sort_order,
        })
      ).data,
    onMutate: async (vars): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) =>
        old
          ? old.map((t) =>
              t.id === vars.taskId ? { ...t, status: vars.status, sort_order: vars.sort_order } : t,
            )
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Reorder tasks within a column. OPTIMISTIC: patch every affected sort_order in
 * the cache, ROLL BACK the whole snapshot on error, revalidate on settle.
 */
export function useReorderTasks(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = taskKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (items: ReorderItems) => (await tasksApi.reorder(workspaceId!, items)).data,
    onMutate: async (items): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) =>
        old
          ? old.map((t) => {
              const item = items.find((i) => i.id === t.id);
              return item ? { ...t, sort_order: item.sort_order } : t;
            })
          : old,
      );
      return { previous };
    },
    onError: (_err, _items, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
