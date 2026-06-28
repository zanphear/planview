import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagsApi, type Tag } from '../tags';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Tags are project-scoped (shared across that project's tasks):
//   tagKeys.all                              -> ['tags']
//   tagKeys.lists()                          -> ['tags', 'list']
//   tagKeys.byProject(wsId, projectId)       -> ['tags', 'list', wsId, projectId]
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  byProject: (workspaceId: string, projectId: string) =>
    [...tagKeys.lists(), workspaceId, projectId] as const,
};

type CreateTagInput = Parameters<typeof tagsApi.create>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** Tags available for a project. */
export function useProjectTags(workspaceId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: tagKeys.byProject(workspaceId ?? '', projectId ?? ''),
    queryFn: async (): Promise<Tag[]> => (await tagsApi.list(workspaceId!, projectId!)).data,
    enabled: !!workspaceId && !!projectId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a tag; append to the project cache and revalidate. Returns the new tag. */
export function useCreateTag(workspaceId: string | undefined, projectId: string | undefined) {
  const qc = useQueryClient();
  const key = tagKeys.byProject(workspaceId ?? '', projectId ?? '');
  return useMutation({
    mutationFn: async (data: CreateTagInput): Promise<Tag> =>
      (await tagsApi.create(workspaceId!, projectId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<Tag[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
