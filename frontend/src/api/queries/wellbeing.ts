import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wellbeingApi, type PulseSurvey, type Kudos } from '../wellbeing';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one filtered list, a whole domain
// (surveys / kudos), or everything under 'wellbeing':
//   wellbeingKeys.all                   -> ['wellbeing']
//   wellbeingKeys.surveyLists()         -> ['wellbeing', 'surveys']
//   wellbeingKeys.surveyList(wsId)      -> ['wellbeing', 'surveys', wsId]
//   wellbeingKeys.kudosLists()          -> ['wellbeing', 'kudos']
//   wellbeingKeys.kudosList(wsId)       -> ['wellbeing', 'kudos', wsId]
// Pulse responses live embedded in each survey's `responses[]`, so submitting a
// response invalidates the survey list rather than owning a key of its own.
export const wellbeingKeys = {
  all: ['wellbeing'] as const,
  surveyLists: () => [...wellbeingKeys.all, 'surveys'] as const,
  surveyList: (workspaceId: string) => [...wellbeingKeys.surveyLists(), workspaceId] as const,
  kudosLists: () => [...wellbeingKeys.all, 'kudos'] as const,
  kudosList: (workspaceId: string) => [...wellbeingKeys.kudosLists(), workspaceId] as const,
};

type CreateSurveyInput = Parameters<typeof wellbeingApi.createSurvey>[1];
type SubmitResponseInput = Parameters<typeof wellbeingApi.submitResponse>[2];
type GiveKudosInput = Parameters<typeof wellbeingApi.giveKudos>[1];

// ── Queries ──────────────────────────────────────────────────────────────────

/** Pulse surveys for a workspace (each carries its embedded responses). */
export function useSurveys(workspaceId: string | undefined) {
  return useQuery({
    queryKey: wellbeingKeys.surveyList(workspaceId ?? ''),
    queryFn: async (): Promise<PulseSurvey[]> =>
      (await wellbeingApi.listSurveys(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

/** Kudos feed for a workspace. */
export function useKudos(workspaceId: string | undefined) {
  return useQuery({
    queryKey: wellbeingKeys.kudosList(workspaceId ?? ''),
    queryFn: async (): Promise<Kudos[]> => (await wellbeingApi.listKudos(workspaceId!)).data,
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────
// No optimistic UI on this page today (it reloaded everything after each write),
// so a plain invalidate is the faithful, correct translation.

/** Create a pulse survey, then revalidate the survey list. */
export function useCreateSurvey(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSurveyInput) =>
      (await wellbeingApi.createSurvey(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wellbeingKeys.surveyLists() });
    },
  });
}

/** Submit a pulse response; revalidate survey lists (responses are embedded). */
export function useSubmitResponse(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { surveyId: string; data: SubmitResponseInput }) =>
      (await wellbeingApi.submitResponse(workspaceId!, vars.surveyId, vars.data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wellbeingKeys.surveyLists() });
    },
  });
}

/** Send kudos to a teammate, then revalidate the kudos feed. */
export function useGiveKudos(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GiveKudosInput) =>
      (await wellbeingApi.giveKudos(workspaceId!, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: wellbeingKeys.kudosLists() });
    },
  });
}
