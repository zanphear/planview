import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { complianceApi, type ComplianceItem } from '../compliance';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one list, all lists, or everything:
//   complianceKeys.all                       -> ['compliance']
//   complianceKeys.lists()                   -> ['compliance', 'list']
//   complianceKeys.list(wsId, params)        -> ['compliance', 'list', wsId, params]
export const complianceKeys = {
  all: ['compliance'] as const,
  lists: () => [...complianceKeys.all, 'list'] as const,
  list: (workspaceId: string, params: ComplianceListParams = {}) =>
    [...complianceKeys.lists(), workspaceId, params] as const,
};

type ComplianceListParams = NonNullable<Parameters<typeof complianceApi.list>[1]>;
type CreateComplianceInput = Parameters<typeof complianceApi.create>[1];
type UpdateComplianceInput = Parameters<typeof complianceApi.update>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** All compliance items for a workspace (server-side filters optional). */
export function useComplianceItems(
  workspaceId: string | undefined,
  params: ComplianceListParams = {},
) {
  return useQuery({
    queryKey: complianceKeys.list(workspaceId ?? '', params),
    queryFn: async () => (await complianceApi.list(workspaceId!, params)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create an item, then invalidate the workspace's lists to revalidate. */
export function useCreateComplianceItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateComplianceInput) =>
      (await complianceApi.create(workspaceId!, data)).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.lists() });
    },
  });
}

/** Update a single item; merge the server result into every cached list. */
export function useUpdateComplianceItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { itemId: string; data: UpdateComplianceInput }) =>
      (await complianceApi.update(workspaceId!, vars.itemId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueriesData<ComplianceItem[]>({ queryKey: complianceKeys.lists() }, (old) =>
        old ? old.map((i) => (i.id === updated.id ? updated : i)) : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.lists() });
    },
  });
}

/** Delete an item with an optimistic remove + rollback on error. */
export function useDeleteComplianceItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await complianceApi.delete(workspaceId!, itemId);
      return itemId;
    },
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: complianceKeys.lists() });
      const previous = qc.getQueriesData<ComplianceItem[]>({ queryKey: complianceKeys.lists() });
      qc.setQueriesData<ComplianceItem[]>({ queryKey: complianceKeys.lists() }, (old) =>
        old ? old.filter((i) => i.id !== itemId) : old,
      );
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.lists() });
    },
  });
}
