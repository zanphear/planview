import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistsApi } from '../checklists';
import type { ChecklistItem } from '../tasks';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Scoped by taskId so each task-detail panel owns its own checklist:
//   checklistKeys.all                        -> ['checklists']
//   checklistKeys.lists()                    -> ['checklists', 'list']
//   checklistKeys.byTask(wsId, taskId)       -> ['checklists', 'list', wsId, taskId]
export const checklistKeys = {
  all: ['checklists'] as const,
  lists: () => [...checklistKeys.all, 'list'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...checklistKeys.lists(), workspaceId, taskId] as const,
};

interface RollbackContext {
  previous: ChecklistItem[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Checklist items for a single task. */
export function useTaskChecklists(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: checklistKeys.byTask(workspaceId ?? '', taskId ?? ''),
    queryFn: async (): Promise<ChecklistItem[]> =>
      (await checklistsApi.list(workspaceId!, taskId!)).data,
    enabled: !!workspaceId && !!taskId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Add a checklist item; merge the server result into the cache, then revalidate. */
export function useCreateChecklistItem(
  workspaceId: string | undefined,
  taskId: string | undefined,
) {
  const qc = useQueryClient();
  const key = checklistKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (title: string): Promise<ChecklistItem> =>
      (await checklistsApi.create(workspaceId!, taskId!, { title })).data,
    onSuccess: (created) => {
      qc.setQueryData<ChecklistItem[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Toggle completion with an optimistic flip + rollback on error. */
export function useToggleChecklistItem(
  workspaceId: string | undefined,
  taskId: string | undefined,
) {
  const qc = useQueryClient();
  const key = checklistKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (vars: { id: string; is_completed: boolean }): Promise<ChecklistItem> =>
      (
        await checklistsApi.update(workspaceId!, taskId!, vars.id, {
          is_completed: vars.is_completed,
        })
      ).data,
    onMutate: async (vars): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChecklistItem[]>(key);
      qc.setQueryData<ChecklistItem[]>(key, (old) =>
        old
          ? old.map((i) => (i.id === vars.id ? { ...i, is_completed: vars.is_completed } : i))
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

/** Delete a checklist item with an optimistic remove + rollback on error. */
export function useDeleteChecklistItem(
  workspaceId: string | undefined,
  taskId: string | undefined,
) {
  const qc = useQueryClient();
  const key = checklistKeys.byTask(workspaceId ?? '', taskId ?? '');
  return useMutation({
    mutationFn: async (itemId: string) => {
      await checklistsApi.delete(workspaceId!, taskId!, itemId);
      return itemId;
    },
    onMutate: async (itemId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChecklistItem[]>(key);
      qc.setQueryData<ChecklistItem[]>(key, (old) =>
        old ? old.filter((i) => i.id !== itemId) : old,
      );
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
