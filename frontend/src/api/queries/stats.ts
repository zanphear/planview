import { useQuery } from '@tanstack/react-query';
import { statsApi, type WorkspaceStats, type PeopleStats, type BurndownData } from '../stats';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one report, a whole family, or
// everything under 'stats':
//   statsKeys.all                          -> ['stats']
//   statsKeys.workspace(wsId)              -> ['stats', 'workspace', wsId]
//   statsKeys.people(wsId)                 -> ['stats', 'people', wsId]
//   statsKeys.burndowns()                  -> ['stats', 'burndown']
//   statsKeys.burndown(wsId, params)       -> ['stats', 'burndown', wsId, params]
export const statsKeys = {
  all: ['stats'] as const,
  workspace: (workspaceId: string) => [...statsKeys.all, 'workspace', workspaceId] as const,
  people: (workspaceId: string) => [...statsKeys.all, 'people', workspaceId] as const,
  burndowns: () => [...statsKeys.all, 'burndown'] as const,
  burndown: (workspaceId: string, params: { days: number; project_id?: string }) =>
    [...statsKeys.burndowns(), workspaceId, params] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────
// Read-only dashboards. No mutations: these wrap the aggregate stats endpoints
// and let TanStack Query own caching / refetch / retry.

/** Task / workspace stats, the dashboard's primary task data. */
export function useWorkspaceStats(workspaceId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.workspace(workspaceId ?? ''),
    queryFn: async (): Promise<WorkspaceStats> => (await statsApi.get(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** People-management aggregate stats, drives the People Dashboard / reporting. */
export function usePeopleStats(workspaceId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.people(workspaceId ?? ''),
    queryFn: async (): Promise<PeopleStats> => (await statsApi.peopleDashboard(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Burndown series for a workspace, optionally scoped to a project / window. */
export function useBurndown(workspaceId: string | undefined, days: number, projectId?: string) {
  const params = { days, ...(projectId ? { project_id: projectId } : {}) };
  return useQuery({
    queryKey: statsKeys.burndown(workspaceId ?? '', params),
    queryFn: async (): Promise<BurndownData> =>
      (await statsApi.burndown(workspaceId!, days, projectId || undefined)).data,
    enabled: !!workspaceId,
  });
}
