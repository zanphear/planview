import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { objectivesApi, type Objective, type KeyResult, type ReviewPeriod } from '../objectives';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003 pattern. Hierarchical keys so partial invalidation works:
//   objectiveKeys.all                       -> ['objectives']
//   objectiveKeys.lists()                   -> ['objectives', 'list']
//   objectiveKeys.list(wsId, periodId)      -> ['objectives', 'list', wsId, periodId]
//   objectiveKeys.periods(wsId)             -> ['objectives', 'periods', wsId]
// The list is keyed on periodId ('' == all periods) so each filtered view gets
// its own cache entry, exactly like the period selector drives it.
export const objectiveKeys = {
  all: ['objectives'] as const,
  lists: () => [...objectiveKeys.all, 'list'] as const,
  list: (workspaceId: string, periodId: string) =>
    [...objectiveKeys.lists(), workspaceId, periodId] as const,
  periods: (workspaceId: string) => [...objectiveKeys.all, 'periods', workspaceId] as const,
};

type CreateObjectiveInput = Parameters<typeof objectivesApi.create>[1];
type UpdateObjectiveInput = Parameters<typeof objectivesApi.update>[2];
type AddKeyResultInput = Parameters<typeof objectivesApi.addKeyResult>[2];
type UpdateKeyResultInput = Parameters<typeof objectivesApi.updateKeyResult>[3];
type CreatePeriodInput = Parameters<typeof objectivesApi.createPeriod>[1];

// Mirror of the page's progress calc so the cached objective.progress stays in
// step after key-result edits (the server recomputes it authoritatively on the
// next list fetch; this keeps the derived stat cards live in between).
function calcProgress(keyResults: KeyResult[]): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((acc, kr) => {
    const target = kr.target_value || 1;
    return acc + Math.min((kr.current_value / target) * 100, 100);
  }, 0);
  return Math.round(sum / keyResults.length);
}

function patchObjective(
  list: Objective[] | undefined,
  objectiveId: string,
  fn: (obj: Objective) => Objective,
): Objective[] | undefined {
  return list ? list.map((obj) => (obj.id === objectiveId ? fn(obj) : obj)) : list;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Objectives for a workspace, optionally filtered to a review period. */
export function useObjectives(workspaceId: string | undefined, periodId: string) {
  return useQuery({
    queryKey: objectiveKeys.list(workspaceId ?? '', periodId),
    queryFn: async () => {
      const params: { period_id?: string } = {};
      if (periodId) params.period_id = periodId;
      return (await objectivesApi.list(workspaceId!, params)).data;
    },
    enabled: !!workspaceId,
  });
}

/** Review periods for the period selector. */
export function useReviewPeriods(workspaceId: string | undefined) {
  return useQuery({
    queryKey: objectiveKeys.periods(workspaceId ?? ''),
    queryFn: async () => (await objectivesApi.listPeriods(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create an objective, append to the active list cache, then revalidate. */
export function useCreateObjective(workspaceId: string | undefined, periodId: string) {
  const qc = useQueryClient();
  const key = objectiveKeys.list(workspaceId ?? '', periodId);
  return useMutation({
    mutationFn: async (data: CreateObjectiveInput) =>
      (await objectivesApi.create(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<Objective[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Update an objective (e.g. status); merge the server result into the cache. */
export function useUpdateObjective(workspaceId: string | undefined, periodId: string) {
  const qc = useQueryClient();
  const key = objectiveKeys.list(workspaceId ?? '', periodId);
  return useMutation({
    mutationFn: async (vars: { objectiveId: string; data: UpdateObjectiveInput }) =>
      (await objectivesApi.update(workspaceId!, vars.objectiveId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<Objective[]>(key, (old) =>
        old ? old.map((o) => (o.id === updated.id ? updated : o)) : old,
      );
    },
  });
}

/** Add a key result; splice it into its objective and recompute progress. */
export function useAddKeyResult(workspaceId: string | undefined, periodId: string) {
  const qc = useQueryClient();
  const key = objectiveKeys.list(workspaceId ?? '', periodId);
  return useMutation({
    mutationFn: async (vars: { objectiveId: string; data: AddKeyResultInput }) =>
      (await objectivesApi.addKeyResult(workspaceId!, vars.objectiveId, vars.data)).data,
    onSuccess: (created, vars) => {
      qc.setQueryData<Objective[]>(key, (old) =>
        patchObjective(old, vars.objectiveId, (obj) => {
          const key_results = [...obj.key_results, created];
          return { ...obj, key_results, progress: calcProgress(key_results) };
        }),
      );
    },
  });
}

/** Update a key result's value; replace it in place and recompute progress. */
export function useUpdateKeyResult(workspaceId: string | undefined, periodId: string) {
  const qc = useQueryClient();
  const key = objectiveKeys.list(workspaceId ?? '', periodId);
  return useMutation({
    mutationFn: async (vars: { objectiveId: string; krId: string; data: UpdateKeyResultInput }) =>
      (await objectivesApi.updateKeyResult(workspaceId!, vars.objectiveId, vars.krId, vars.data))
        .data,
    onSuccess: (updated, vars) => {
      qc.setQueryData<Objective[]>(key, (old) =>
        patchObjective(old, vars.objectiveId, (obj) => {
          const key_results = obj.key_results.map((k) => (k.id === updated.id ? updated : k));
          return { ...obj, key_results, progress: calcProgress(key_results) };
        }),
      );
    },
  });
}

/** Create a review period, append to the periods cache, then revalidate. */
export function useCreatePeriod(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = objectiveKeys.periods(workspaceId ?? '');
  return useMutation({
    mutationFn: async (data: CreatePeriodInput) =>
      (await objectivesApi.createPeriod(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<ReviewPeriod[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
