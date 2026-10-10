import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidatesApi, type Candidate, type CandidateEvent } from '../candidates';
import { membersApi } from '../users';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one list, all lists, or everything:
//   candidateKeys.all               -> ['candidates']
//   candidateKeys.lists()           -> ['candidates', 'list']
//   candidateKeys.list(workspaceId) -> ['candidates', 'list', wsId]
export const candidateKeys = {
  all: ['candidates'] as const,
  lists: () => [...candidateKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...candidateKeys.lists(), workspaceId] as const,
};

type CreateCandidateInput = Parameters<typeof candidatesApi.create>[1];
type UpdateCandidateInput = Parameters<typeof candidatesApi.update>[2];
type AddEventInput = Parameters<typeof candidatesApi.addEvent>[2];

interface RollbackContext {
  previous: Candidate[] | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** All candidates in a workspace (the pipeline's primary server data). */
export function useCandidates(workspaceId: string | undefined) {
  return useQuery({
    queryKey: candidateKeys.list(workspaceId ?? ''),
    queryFn: async () => (await candidatesApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Workspace members, secondary server data for the interviewer picker. */
export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['members', workspaceId ?? ''],
    queryFn: async () => (await membersApi.list(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a candidate, then append to the workspace list cache and revalidate. */
export function useCreateCandidate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = candidateKeys.list(workspaceId ?? '');
  return useMutation({
    mutationFn: async (data: CreateCandidateInput) =>
      (await candidatesApi.create(workspaceId!, data)).data,
    onSuccess: (created) => {
      qc.setQueryData<Candidate[]>(key, (old) => (old ? [...old, created] : [created]));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Move a candidate to a new pipeline stage. OPTIMISTIC: snapshot the cache,
 * patch the candidate's status in place on `onMutate`, ROLL BACK to the snapshot
 * on error, revalidate on settle. (ADR: optimistic moves must roll back.)
 */
export function useUpdateCandidateStatus(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = candidateKeys.list(workspaceId ?? '');
  return useMutation({
    mutationFn: async (vars: { candidateId: string; status: string }) =>
      (await candidatesApi.update(workspaceId!, vars.candidateId, { status: vars.status })).data,
    onMutate: async (vars): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Candidate[]>(key);
      qc.setQueryData<Candidate[]>(key, (old) =>
        old ? old.map((c) => (c.id === vars.candidateId ? { ...c, status: vars.status } : c)) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (updated) => {
      qc.setQueryData<Candidate[]>(key, (old) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Update arbitrary candidate fields; merge the server result into the cache. */
export function useUpdateCandidate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = candidateKeys.list(workspaceId ?? '');
  return useMutation({
    mutationFn: async (vars: { candidateId: string; data: UpdateCandidateInput }) =>
      (await candidatesApi.update(workspaceId!, vars.candidateId, vars.data)).data,
    onSuccess: (updated) => {
      qc.setQueryData<Candidate[]>(key, (old) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old,
      );
    },
  });
}

/** Delete a candidate with an optimistic remove + rollback on error. */
export function useDeleteCandidate(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = candidateKeys.list(workspaceId ?? '');
  return useMutation({
    mutationFn: async (candidateId: string) => {
      await candidatesApi.delete(workspaceId!, candidateId);
      return candidateId;
    },
    onMutate: async (candidateId): Promise<RollbackContext> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Candidate[]>(key);
      qc.setQueryData<Candidate[]>(key, (old) =>
        old ? old.filter((c) => c.id !== candidateId) : old,
      );
      return { previous };
    },
    onError: (_err, _candidateId, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Add a pipeline event to a candidate; splice it into that candidate's cache entry. */
export function useAddCandidateEvent(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const key = candidateKeys.list(workspaceId ?? '');
  return useMutation({
    mutationFn: async (vars: { candidateId: string; data: AddEventInput }) =>
      (await candidatesApi.addEvent(workspaceId!, vars.candidateId, vars.data)).data,
    onSuccess: (event: CandidateEvent, vars) => {
      qc.setQueryData<Candidate[]>(key, (old) =>
        old
          ? old.map((c) => (c.id === vars.candidateId ? { ...c, events: [...c.events, event] } : c))
          : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
