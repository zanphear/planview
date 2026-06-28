import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developmentApi } from '../development';
import type { DevelopmentPlan, CareerPathway } from '../development';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical keys so partial invalidation works:
//   developmentKeys.all                    -> ['development']
//   developmentKeys.plans()                -> ['development', 'plans']
//   developmentKeys.plansList(ws, userId)  -> ['development', 'plans', ws, userId]
//   developmentKeys.pathways()             -> ['development', 'pathways']
//   developmentKeys.pathwaysList(ws)       -> ['development', 'pathways', ws]
export const developmentKeys = {
  all: ['development'] as const,
  plans: () => [...developmentKeys.all, 'plans'] as const,
  plansList: (workspaceId: string, userId: string | null) =>
    [...developmentKeys.plans(), workspaceId, userId] as const,
  pathways: () => [...developmentKeys.all, 'pathways'] as const,
  pathwaysList: (workspaceId: string) => [...developmentKeys.pathways(), workspaceId] as const,
};

// Reuse the fetcher signatures so request bodies stay in lock-step with the API.
type CreatePlanInput = Parameters<typeof developmentApi.create>[1];
type UpdatePlanInput = Parameters<typeof developmentApi.update>[2];
type AddGoalInput = Parameters<typeof developmentApi.addGoal>[2];
type UpdateGoalInput = Parameters<typeof developmentApi.updateGoal>[3];
type AddMilestoneInput = Parameters<typeof developmentApi.addMilestone>[2];
type UpdateMilestoneInput = Parameters<typeof developmentApi.updateMilestone>[3];
type AddCheckpointInput = Parameters<typeof developmentApi.addCheckpoint>[2];
type UpdateCheckpointInput = Parameters<typeof developmentApi.updateCheckpoint>[3];
type CreatePathwayInput = Parameters<typeof developmentApi.createPathway>[1];
type UpdatePathwayInput = Parameters<typeof developmentApi.updatePathway>[2];

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Development plans for a workspace, optionally filtered to one member. Plans
 * arrive with their goals/milestones/checkpoints eager-loaded, so this single
 * list is the primary server data for the whole Plans tab.
 */
export function useDevelopmentPlans(workspaceId: string | undefined, userId: string | null) {
  return useQuery({
    queryKey: developmentKeys.plansList(workspaceId ?? '', userId),
    queryFn: async () =>
      (await developmentApi.list(workspaceId!, userId ? { user_id: userId } : undefined)).data,
    enabled: !!workspaceId,
  });
}

/** Career pathways for a workspace (the Pathways tab + the create-plan picker). */
export function useCareerPathways(workspaceId: string | undefined) {
  return useQuery({
    queryKey: developmentKeys.pathwaysList(workspaceId ?? ''),
    queryFn: async () => (await developmentApi.listPathways(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// Every goal/milestone/checkpoint/plan write changes a nested field of the plans
// list, so they all revalidate the whole `plans()` subtree rather than trying to
// surgically patch deeply-nested cache entries.

function useInvalidatePlans() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: developmentKeys.plans() });
}

export function useCreatePlan(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (data: CreatePlanInput) =>
      (await developmentApi.create(workspaceId!, data)).data,
    onSuccess: invalidate,
  });
}

export function useUpdatePlan(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; data: UpdatePlanInput }) =>
      (await developmentApi.update(workspaceId!, vars.planId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useAddGoal(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; data: AddGoalInput }) =>
      (await developmentApi.addGoal(workspaceId!, vars.planId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateGoal(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; goalId: string; data: UpdateGoalInput }) =>
      (await developmentApi.updateGoal(workspaceId!, vars.planId, vars.goalId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useAddMilestone(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; data: AddMilestoneInput }) =>
      (await developmentApi.addMilestone(workspaceId!, vars.planId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateMilestone(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; milestoneId: string; data: UpdateMilestoneInput }) =>
      (await developmentApi.updateMilestone(workspaceId!, vars.planId, vars.milestoneId, vars.data))
        .data,
    onSuccess: invalidate,
  });
}

export function useDeleteMilestone(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; milestoneId: string }) => {
      await developmentApi.deleteMilestone(workspaceId!, vars.planId, vars.milestoneId);
      return vars.milestoneId;
    },
    onSuccess: invalidate,
  });
}

export function useAddCheckpoint(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: { planId: string; data: AddCheckpointInput }) =>
      (await developmentApi.addCheckpoint(workspaceId!, vars.planId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateCheckpoint(workspaceId: string | undefined) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: async (vars: {
      planId: string;
      checkpointId: string;
      data: UpdateCheckpointInput;
    }) =>
      (
        await developmentApi.updateCheckpoint(
          workspaceId!,
          vars.planId,
          vars.checkpointId,
          vars.data,
        )
      ).data,
    onSuccess: invalidate,
  });
}

// Pathway writes touch both the pathways list and the plans list (plans render
// pathway names; the pathways tab counts linked plans).
function useInvalidatePathways(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: developmentKeys.pathwaysList(workspaceId ?? '') });
    qc.invalidateQueries({ queryKey: developmentKeys.plans() });
  };
}

export function useCreatePathway(workspaceId: string | undefined) {
  const invalidate = useInvalidatePathways(workspaceId);
  return useMutation({
    mutationFn: async (data: CreatePathwayInput) =>
      (await developmentApi.createPathway(workspaceId!, data)).data,
    onSuccess: invalidate,
  });
}

export function useUpdatePathway(workspaceId: string | undefined) {
  const invalidate = useInvalidatePathways(workspaceId);
  return useMutation({
    mutationFn: async (vars: { pathwayId: string; data: UpdatePathwayInput }) =>
      (await developmentApi.updatePathway(workspaceId!, vars.pathwayId, vars.data)).data,
    onSuccess: invalidate,
  });
}

export function useDeletePathway(workspaceId: string | undefined) {
  const invalidate = useInvalidatePathways(workspaceId);
  return useMutation({
    mutationFn: async (pathwayId: string) => {
      await developmentApi.deletePathway(workspaceId!, pathwayId);
      return pathwayId;
    },
    onSuccess: invalidate,
  });
}

// Re-export the row types so the page imports plan/pathway shapes from one place.
export type { DevelopmentPlan, CareerPathway };
