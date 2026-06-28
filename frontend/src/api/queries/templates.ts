import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../templates';

// ── Query key factory ────────────────────────────────────────────────────────
// Hierarchical so we can invalidate one list, all lists, or everything:
//   templateKeys.all               -> ['templates']
//   templateKeys.lists()           -> ['templates', 'list']
//   templateKeys.list(workspaceId) -> ['templates', 'list', wsId]
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...templateKeys.lists(), workspaceId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/** All task templates in a workspace. */
export function useTaskTemplates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.list(workspaceId ?? ''),
    queryFn: async () => (await templatesApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}
