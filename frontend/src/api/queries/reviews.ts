import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, type ReviewCycle, type Review } from '../reviews';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical keys so partial invalidation works:
//   reviewsKeys.all                       -> ['reviews']
//   reviewsKeys.cycles(wsId)              -> ['reviews', 'cycles', wsId]
//   reviewsKeys.lists()                   -> ['reviews', 'list']
//   reviewsKeys.list(wsId, cycleId?)      -> ['reviews', 'list', wsId, cycleId|null]
export const reviewsKeys = {
  all: ['reviews'] as const,
  cycles: (workspaceId: string) => [...reviewsKeys.all, 'cycles', workspaceId] as const,
  lists: () => [...reviewsKeys.all, 'list'] as const,
  list: (workspaceId: string, cycleId?: string) =>
    [...reviewsKeys.lists(), workspaceId, cycleId ?? null] as const,
};

type CreateCycleInput = Parameters<typeof reviewsApi.createCycle>[1];
type UpdateCycleInput = Parameters<typeof reviewsApi.updateCycle>[2];
type CreateReviewInput = Parameters<typeof reviewsApi.create>[2];
type UpdateReviewInput = Parameters<typeof reviewsApi.update>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/** All review cycles in a workspace. */
export function useReviewCycles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: reviewsKeys.cycles(workspaceId ?? ''),
    queryFn: async () => (await reviewsApi.listCycles(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Reviews in a workspace, optionally filtered to a single cycle. */
export function useReviews(workspaceId: string | undefined, cycleId?: string) {
  return useQuery({
    queryKey: reviewsKeys.list(workspaceId ?? '', cycleId),
    queryFn: async () =>
      (await reviewsApi.list(workspaceId!, cycleId ? { cycle_id: cycleId } : undefined)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCycle(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCycleInput) =>
      (await reviewsApi.createCycle(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewsKeys.cycles(workspaceId ?? '') });
    },
  });
}

export function useUpdateCycle(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { cycleId: string; data: UpdateCycleInput }) =>
      (await reviewsApi.updateCycle(workspaceId!, vars.cycleId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<ReviewCycle[]>(reviewsKeys.cycles(workspaceId ?? ''), (old) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old,
      );
    },
  });
}

export function useCreateReview(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { cycleId: string; data: CreateReviewInput }) =>
      (await reviewsApi.create(workspaceId!, vars.cycleId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewsKeys.lists() });
    },
  });
}

export function useUpdateReview(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { reviewId: string; data: UpdateReviewInput }) =>
      (await reviewsApi.update(workspaceId!, vars.reviewId, vars.data)).data,
    onSuccess: (updated) => {
      // Patch the matching review in every cached (filtered) list, then revalidate.
      qc.setQueriesData<Review[]>({ queryKey: reviewsKeys.lists() }, (old) =>
        old ? old.map((r) => (r.id === updated.id ? updated : r)) : old,
      );
      qc.invalidateQueries({ queryKey: reviewsKeys.lists() });
    },
  });
}
