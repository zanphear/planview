import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi, type User } from '../users';
import { webhooksApi, type Webhook } from '../webhooks';
import { customFieldsApi, type CustomField } from '../customFields';
import { templatesApi, type TaskTemplate } from '../templates';
import { lookupsApi, type LookupValue } from '../lookups';
import { feedbackApi, type FeedbackItem } from '../feedback';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. One root ('settings') with a sub-domain per data section so we can
// invalidate a single section or everything under settings:
//   settingsKeys.all                  -> ['settings']
//   settingsKeys.members(wsId)        -> ['settings', 'members', wsId]
//   settingsKeys.webhooks(wsId)       -> ['settings', 'webhooks', wsId]
//   settingsKeys.customFields(wsId)   -> ['settings', 'custom-fields', wsId]
//   settingsKeys.templates(wsId)      -> ['settings', 'templates', wsId]
//   settingsKeys.referenceData(wsId)  -> ['settings', 'reference-data', wsId]
//   settingsKeys.feedback(wsId)       -> ['settings', 'feedback', wsId]
export const settingsKeys = {
  all: ['settings'] as const,
  members: (workspaceId: string) => [...settingsKeys.all, 'members', workspaceId] as const,
  webhooks: (workspaceId: string) => [...settingsKeys.all, 'webhooks', workspaceId] as const,
  customFields: (workspaceId: string) =>
    [...settingsKeys.all, 'custom-fields', workspaceId] as const,
  templates: (workspaceId: string) => [...settingsKeys.all, 'templates', workspaceId] as const,
  referenceData: (workspaceId: string) =>
    [...settingsKeys.all, 'reference-data', workspaceId] as const,
  feedback: (workspaceId: string) => [...settingsKeys.all, 'feedback', workspaceId] as const,
};

type InviteMemberInput = Parameters<typeof membersApi.invite>[1];
type AddMemberInput = Parameters<typeof membersApi.add>[1];
type UpdateMemberInput = Parameters<typeof membersApi.update>[2];
type CreateWebhookInput = Parameters<typeof webhooksApi.create>[1];
type UpdateWebhookInput = Parameters<typeof webhooksApi.update>[2];
type CreateCustomFieldInput = Parameters<typeof customFieldsApi.create>[1];
type CreateTemplateInput = Parameters<typeof templatesApi.create>[1];
type CreateLookupInput = Parameters<typeof lookupsApi.create>[2];
type UpdateLookupInput = Parameters<typeof lookupsApi.update>[3];
type UpdateFeedbackInput = Parameters<typeof feedbackApi.update>[2];

// ── Queries ──────────────────────────────────────────────────────────────────
// Each is the server data behind one Settings section. Plain reads; the mutations
// below revalidate them. No optimistic UI — the page reloaded everything after a
// write, so a straight invalidate is the faithful translation.

/** Workspace members (Members tab). */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.members(workspaceId ?? ''),
    queryFn: async (): Promise<User[]> => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Outbound webhooks (Webhooks tab). */
export function useWebhooks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.webhooks(workspaceId ?? ''),
    queryFn: async (): Promise<Webhook[]> => (await webhooksApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Custom task fields (Custom Fields tab). */
export function useCustomFields(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.customFields(workspaceId ?? ''),
    queryFn: async (): Promise<CustomField[]> => (await customFieldsApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Task templates (Templates tab). */
export function useTaskTemplates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.templates(workspaceId ?? ''),
    queryFn: async (): Promise<TaskTemplate[]> => (await templatesApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** All lookup values grouped by category (Reference Data tab). */
export function useReferenceData(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.referenceData(workspaceId ?? ''),
    queryFn: async (): Promise<Record<string, LookupValue[]>> =>
      (await lookupsApi.listAll(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Submitted bug reports & feature requests (Feedback tab). */
export function useFeedback(workspaceId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.feedback(workspaceId ?? ''),
    queryFn: async (): Promise<FeedbackItem[]> => (await feedbackApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Member mutations ───────────────────────────────────────────────────────--

/** Invite a member; returns the temp password, then revalidates the member list. */
export function useInviteMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteMemberInput) =>
      (await membersApi.invite(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.members(workspaceId ?? '') });
    },
  });
}

/** Add a login-less member, then revalidate the member list. */
export function useAddMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddMemberInput) => (await membersApi.add(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.members(workspaceId ?? '') });
    },
  });
}

/** Update a member (role change, etc.), then revalidate the member list. */
export function useUpdateMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; data: UpdateMemberInput }) =>
      (await membersApi.update(workspaceId!, vars.userId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.members(workspaceId ?? '') });
    },
  });
}

/** Remove a member, then revalidate the member list. */
export function useRemoveMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await membersApi.remove(workspaceId!, userId);
      return userId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.members(workspaceId ?? '') });
    },
  });
}

// ── Webhook mutations ─────────────────────────────────────────────────────--

export function useCreateWebhook(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWebhookInput) =>
      (await webhooksApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.webhooks(workspaceId ?? '') });
    },
  });
}

export function useUpdateWebhook(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { webhookId: string; data: UpdateWebhookInput }) =>
      (await webhooksApi.update(workspaceId!, vars.webhookId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.webhooks(workspaceId ?? '') });
    },
  });
}

export function useDeleteWebhook(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (webhookId: string) => {
      await webhooksApi.delete(workspaceId!, webhookId);
      return webhookId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.webhooks(workspaceId ?? '') });
    },
  });
}

// ── Custom field mutations ─────────────────────────────────────────────────--

export function useCreateCustomField(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomFieldInput) =>
      (await customFieldsApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.customFields(workspaceId ?? '') });
    },
  });
}

export function useDeleteCustomField(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fieldId: string) => {
      await customFieldsApi.delete(workspaceId!, fieldId);
      return fieldId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.customFields(workspaceId ?? '') });
    },
  });
}

// ── Template mutations ──────────────────────────────────────────────────────-

export function useCreateTemplate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTemplateInput) =>
      (await templatesApi.create(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.templates(workspaceId ?? '') });
    },
  });
}

export function useDeleteTemplate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      await templatesApi.delete(workspaceId!, templateId);
      return templateId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.templates(workspaceId ?? '') });
    },
  });
}

// ── Lookup / reference data mutations ───────────────────────────────────────--
// Callers should also invalidate the lookupStore cache (per category) in their
// onSuccess; that store is the dropdown cache and lives outside React Query.

export function useCreateLookup(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { category: string; data: CreateLookupInput }) =>
      (await lookupsApi.create(workspaceId!, vars.category, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.referenceData(workspaceId ?? '') });
    },
  });
}

export function useUpdateLookup(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { category: string; id: string; data: UpdateLookupInput }) =>
      (await lookupsApi.update(workspaceId!, vars.category, vars.id, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.referenceData(workspaceId ?? '') });
    },
  });
}

export function useDeleteLookup(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { category: string; id: string }) => {
      await lookupsApi.delete(workspaceId!, vars.category, vars.id);
      return vars;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.referenceData(workspaceId ?? '') });
    },
  });
}

// ── Feedback mutations ──────────────────────────────────────────────────────-

/** Resolve / change the status of a feedback item, then revalidate the list. */
export function useResolveFeedback(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; data: UpdateFeedbackInput }) =>
      (await feedbackApi.update(workspaceId!, vars.id, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.feedback(workspaceId ?? '') });
    },
  });
}
