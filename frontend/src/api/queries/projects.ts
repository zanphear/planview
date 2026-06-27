import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type Project } from '../projects';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003 pilot. Hierarchical keys so partial invalidation works:
//   projectKeys.all                  -> ['projects']
//   projectKeys.list(workspaceId)    -> ['projects', 'list', wsId]
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...projectKeys.lists(), workspaceId] as const,
};

type CreateProjectInput = Parameters<typeof projectsApi.create>[1];
type UpdateProjectInput = Parameters<typeof projectsApi.update>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** All projects in a workspace. */
export function useProjects(workspaceId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId ?? ''),
    queryFn: async () => (await projectsApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/**
 * A single project, selected out of the workspace list query so it shares the
 * same cache entry (no extra request). The API has no get-by-id endpoint.
 */
export function useProject(
  workspaceId: string | undefined,
  projectId: string | undefined
) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId ?? ''),
    queryFn: async () => (await projectsApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
    select: (projects: Project[]) => projects.find((p) => p.id === projectId),
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProject(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProjectInput) =>
      (await projectsApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId ?? '') });
    },
  });
}

export function useUpdateProject(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { projectId: string; data: UpdateProjectInput }) =>
      (await projectsApi.update(workspaceId!, vars.projectId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(projectKeys.list(workspaceId ?? ''), (old) =>
        old ? old.map((p) => (p.id === updated.id ? updated : p)) : old
      );
    },
  });
}

export function useDeleteProject(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await projectsApi.delete(workspaceId!, projectId);
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.setQueryData<Project[]>(projectKeys.list(workspaceId ?? ''), (old) =>
        old ? old.filter((p) => p.id !== projectId) : old
      );
    },
  });
}
