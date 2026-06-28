import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rotasApi, type Rota } from '../rotas';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one filtered list or everything
// under 'rotas'. Entries (shifts/assignments) are returned nested inside each
// Rota, so there is one server list and every write revalidates it:
//   rotaKeys.all                 -> ['rotas']
//   rotaKeys.lists()             -> ['rotas', 'list']
//   rotaKeys.list(wsId, type)    -> ['rotas', 'list', wsId, type]
export const rotaKeys = {
  all: ['rotas'] as const,
  lists: () => [...rotaKeys.all, 'list'] as const,
  list: (workspaceId: string, rotaType?: string) =>
    [...rotaKeys.lists(), workspaceId, rotaType ?? null] as const,
};

type CreateRotaInput = Parameters<typeof rotasApi.create>[1];
type UpdateRotaInput = Parameters<typeof rotasApi.update>[2];
type CreateEntryInput = Parameters<typeof rotasApi.createEntry>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** All rotas for a workspace (with their entries nested). */
export function useRotas(workspaceId: string | undefined, rotaType?: string) {
  return useQuery({
    queryKey: rotaKeys.list(workspaceId ?? '', rotaType),
    queryFn: async (): Promise<Rota[]> => (await rotasApi.list(workspaceId!, rotaType)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// No optimistic UI on this page today (it reloaded everything after each write),
// so a plain invalidate of the rota lists is the faithful translation. Entry
// writes revalidate the same lists because entries live inside the Rota payload.

/** Create a rota, then revalidate rota lists. */
export function useCreateRota(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRotaInput) => (await rotasApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rotaKeys.lists() });
    },
  });
}

/** Update a rota, then revalidate rota lists. */
export function useUpdateRota(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rotaId: string; data: UpdateRotaInput }) =>
      (await rotasApi.update(workspaceId!, vars.rotaId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rotaKeys.lists() });
    },
  });
}

/** Delete a rota, then revalidate rota lists. */
export function useDeleteRota(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rotaId: string) => {
      await rotasApi.delete(workspaceId!, rotaId);
      return rotaId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rotaKeys.lists() });
    },
  });
}

/** Add an entry (assignment) to a rota, then revalidate rota lists. */
export function useCreateRotaEntry(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rotaId: string; data: CreateEntryInput }) =>
      (await rotasApi.createEntry(workspaceId!, vars.rotaId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rotaKeys.lists() });
    },
  });
}

/** Remove an entry (assignment) from a rota, then revalidate rota lists. */
export function useDeleteRotaEntry(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rotaId: string; entryId: string }) => {
      await rotasApi.deleteEntry(workspaceId!, vars.rotaId, vars.entryId);
      return vars.entryId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rotaKeys.lists() });
    },
  });
}
