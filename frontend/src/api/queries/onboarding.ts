import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingApi, type OnboardingTemplate, type OnboardingChecklist } from '../onboarding';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one workspace's list, a whole
// domain (templates / checklists), or everything under 'onboarding':
//   onboardingKeys.all                       -> ['onboarding']
//   onboardingKeys.templateLists()           -> ['onboarding', 'templates']
//   onboardingKeys.templateList(wsId)        -> ['onboarding', 'templates', wsId]
//   onboardingKeys.checklistLists()          -> ['onboarding', 'checklists']
//   onboardingKeys.checklistList(wsId)       -> ['onboarding', 'checklists', wsId]
export const onboardingKeys = {
  all: ['onboarding'] as const,
  templateLists: () => [...onboardingKeys.all, 'templates'] as const,
  templateList: (workspaceId: string) => [...onboardingKeys.templateLists(), workspaceId] as const,
  checklistLists: () => [...onboardingKeys.all, 'checklists'] as const,
  checklistList: (workspaceId: string) =>
    [...onboardingKeys.checklistLists(), workspaceId] as const,
};

type CreateTemplateInput = Parameters<typeof onboardingApi.createTemplate>[1];
type CreateChecklistInput = Parameters<typeof onboardingApi.createChecklist>[1];

interface ToggleVars {
  checklistId: string;
  itemId: string;
}

interface ToggleRollback {
  previous: OnboardingChecklist[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Onboarding / offboarding templates for a workspace. */
export function useOnboardingTemplates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.templateList(workspaceId ?? ''),
    queryFn: async (): Promise<OnboardingTemplate[]> =>
      (await onboardingApi.listTemplates(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Active onboarding / offboarding checklists for a workspace. */
export function useOnboardingChecklists(workspaceId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.checklistList(workspaceId ?? ''),
    queryFn: async (): Promise<OnboardingChecklist[]> =>
      (await onboardingApi.listChecklists(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a template, then append it to the template list cache and revalidate. */
export function useCreateTemplate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = onboardingKeys.templateList(workspaceId ?? '');
  return useMutation({
    mutationFn: async (data: CreateTemplateInput) =>
      (await onboardingApi.createTemplate(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<OnboardingTemplate[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Delete a template, removing it from the cache and revalidating. */
export function useDeleteTemplate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = onboardingKeys.templateList(workspaceId ?? '');
  return useMutation({
    mutationFn: async (templateId: string) => {
      await onboardingApi.deleteTemplate(workspaceId!, templateId);
      return templateId;
    },
    onSuccess: (templateId) => {
      qc.setQueryData<OnboardingTemplate[]>(key, (old) =>
        old ? old.filter((t) => t.id !== templateId) : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Start a checklist, append it to the checklist list cache and revalidate. */
export function useCreateChecklist(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = onboardingKeys.checklistList(workspaceId ?? '');
  return useMutation({
    mutationFn: async (data: CreateChecklistInput) =>
      (await onboardingApi.createChecklist(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<OnboardingChecklist[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Toggle a checklist item's completed state. OPTIMISTIC: flip the item in the
 * cache immediately, ROLL BACK the snapshot on error, then reconcile with the
 * server's canonical checklist on success and revalidate on settle.
 */
export function useToggleChecklistItem(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = onboardingKeys.checklistList(workspaceId ?? '');
  return useMutation({
    mutationFn: async (vars: ToggleVars) =>
      (await onboardingApi.toggleItem(workspaceId!, vars.checklistId, vars.itemId)).data,
    onMutate: async (vars): Promise<ToggleRollback> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<OnboardingChecklist[]>(key);
      qc.setQueryData<OnboardingChecklist[]>(key, (old) =>
        old
          ? old.map((cl) =>
              cl.id === vars.checklistId
                ? {
                    ...cl,
                    checklist_items: cl.checklist_items.map((item) =>
                      item.id === vars.itemId ? { ...item, completed: !item.completed } : item,
                    ),
                  }
                : cl,
            )
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (updated) => {
      qc.setQueryData<OnboardingChecklist[]>(key, (old) =>
        old ? old.map((cl) => (cl.id === updated.id ? updated : cl)) : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
