import { useQuery } from '@tanstack/react-query';
import {
  timeEntriesApi,
  type ResourceUtilisation,
  type Absence,
  type TimeEntry,
} from '../timeEntries';

// ── Query key factory ────────────────────────────────────────────────────────
// ADR 0003. Hierarchical so we can invalidate one filtered view, a whole domain
// (utilisation / absences / task entries), or everything under 'timeEntries':
//   timeEntryKeys.all                              -> ['timeEntries']
//   timeEntryKeys.utilisations()                   -> ['timeEntries', 'utilisation']
//   timeEntryKeys.utilisation(wsId, range)         -> ['timeEntries', 'utilisation', wsId, range]
//   timeEntryKeys.absencesAll()                    -> ['timeEntries', 'absences']
//   timeEntryKeys.absences(wsId, range)            -> ['timeEntries', 'absences', wsId, range]
//   timeEntryKeys.taskLists()                      -> ['timeEntries', 'task']
//   timeEntryKeys.byTask(wsId, taskId)             -> ['timeEntries', 'task', wsId, taskId]
type DateRange = { since: string; until: string };

export const timeEntryKeys = {
  all: ['timeEntries'] as const,
  utilisations: () => [...timeEntryKeys.all, 'utilisation'] as const,
  utilisation: (workspaceId: string, range: DateRange) =>
    [...timeEntryKeys.utilisations(), workspaceId, range] as const,
  absencesAll: () => [...timeEntryKeys.all, 'absences'] as const,
  absences: (workspaceId: string, range: DateRange) =>
    [...timeEntryKeys.absencesAll(), workspaceId, range] as const,
  taskLists: () => [...timeEntryKeys.all, 'task'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...timeEntryKeys.taskLists(), workspaceId, taskId] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/** Per-member resource utilisation over a date range (ResourcePage). */
export function useResourceUtilisation(workspaceId: string | undefined, range: DateRange) {
  return useQuery({
    queryKey: timeEntryKeys.utilisation(workspaceId ?? '', range),
    queryFn: async (): Promise<ResourceUtilisation[]> =>
      (await timeEntriesApi.resourceUtilisation(workspaceId!, range)).data,
    enabled: !!workspaceId,
  });
}

/** Absences (leave + time-off) spanning a date range (AbsenceCalendarPage). */
export function useAbsences(workspaceId: string | undefined, range: DateRange) {
  return useQuery({
    queryKey: timeEntryKeys.absences(workspaceId ?? '', range),
    queryFn: async (): Promise<Absence[]> =>
      (await timeEntriesApi.absences(workspaceId!, range)).data,
    enabled: !!workspaceId,
  });
}

/** Time entries logged against a single task. */
export function useTaskTimeEntries(workspaceId: string | undefined, taskId: string | undefined) {
  return useQuery({
    queryKey: timeEntryKeys.byTask(workspaceId ?? '', taskId ?? ''),
    queryFn: async (): Promise<TimeEntry[]> =>
      (await timeEntriesApi.listForTask(workspaceId!, taskId!)).data,
    enabled: !!workspaceId && !!taskId,
  });
}
