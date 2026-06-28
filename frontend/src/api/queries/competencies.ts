import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { competenciesApi, type Competency, type UserCompetency } from '../competencies';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one filtered list, the whole
// skills matrix, or everything under 'competencies':
//   competencyKeys.all                         -> ['competencies']
//   competencyKeys.lists()                      -> ['competencies', 'list']
//   competencyKeys.list(wsId, params)           -> ['competencies', 'list', wsId, params]
//   competencyKeys.matrices()                   -> ['competencies', 'matrix']
//   competencyKeys.matrix(wsId, params)         -> ['competencies', 'matrix', wsId, params]
export const competencyKeys = {
  all: ['competencies'] as const,
  lists: () => [...competencyKeys.all, 'list'] as const,
  list: (workspaceId: string, params: { category?: string }) =>
    [...competencyKeys.lists(), workspaceId, params] as const,
  matrices: () => [...competencyKeys.all, 'matrix'] as const,
  matrix: (workspaceId: string, params: { user_id?: string }) =>
    [...competencyKeys.matrices(), workspaceId, params] as const,
};

type AssessInput = Parameters<typeof competenciesApi.assess>[2];
type UpdateAssessmentInput = Parameters<typeof competenciesApi.updateAssessment>[3];

// ── Queries ──────────────────────────────────────────────────────────────────

/** Competency definitions for a workspace, optionally filtered by category. */
export function useCompetencies(
  workspaceId: string | undefined,
  params: { category?: string } = {},
) {
  return useQuery({
    queryKey: competencyKeys.list(workspaceId ?? '', params),
    queryFn: async (): Promise<Competency[]> =>
      (await competenciesApi.list(workspaceId!, params)).data,
    enabled: !!workspaceId,
  });
}

/** Skills matrix (per-user competency assessments) for a workspace. */
export function useCompetencyMatrix(
  workspaceId: string | undefined,
  params: { user_id?: string } = {},
) {
  return useQuery({
    queryKey: competencyKeys.matrix(workspaceId ?? '', params),
    queryFn: async (): Promise<UserCompetency[]> =>
      (await competenciesApi.matrix(workspaceId!, params)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// The page previously reloaded everything after each write, so a plain
// invalidate is the faithful translation (ADR 0003). Definition writes touch
// the matrix too (a deleted competency drops its column), so CRUD invalidates
// both domains; assessments only touch the matrix.

/** Create a competency, then revalidate definition lists + the matrix. */
export function useCreateCompetency(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Competency>) =>
      (await competenciesApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competencyKeys.lists() });
      qc.invalidateQueries({ queryKey: competencyKeys.matrices() });
    },
  });
}

/** Update a competency, then revalidate definition lists + the matrix. */
export function useUpdateCompetency(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { competencyId: string; data: Partial<Competency> }) =>
      (await competenciesApi.update(workspaceId!, vars.competencyId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competencyKeys.lists() });
      qc.invalidateQueries({ queryKey: competencyKeys.matrices() });
    },
  });
}

/** Delete a competency, then revalidate definition lists + the matrix. */
export function useDeleteCompetency(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competencyId: string) => {
      await competenciesApi.delete(workspaceId!, competencyId);
      return competencyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competencyKeys.lists() });
      qc.invalidateQueries({ queryKey: competencyKeys.matrices() });
    },
  });
}

/** Assess a user against a competency, then revalidate the matrix. */
export function useAssessCompetency(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { competencyId: string; data: AssessInput }) =>
      (await competenciesApi.assess(workspaceId!, vars.competencyId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competencyKeys.matrices() });
    },
  });
}

/** Update an existing assessment (e.g. clear a level), then revalidate the matrix. */
export function useUpdateAssessment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      competencyId: string;
      assessmentId: string;
      data: UpdateAssessmentInput;
    }) =>
      (
        await competenciesApi.updateAssessment(
          workspaceId!,
          vars.competencyId,
          vars.assessmentId,
          vars.data,
        )
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competencyKeys.matrices() });
    },
  });
}
