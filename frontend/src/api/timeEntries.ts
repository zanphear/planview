import { api } from './client';

export interface TimeEntry {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  minutes: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  user_name: string | null;
  task_name: string | null;
}

export interface TimeEntryCreate {
  minutes: number;
  description?: string;
  logged_at?: string;
}

export interface ResourceUtilisation {
  user_id: string;
  user_name: string;
  user_colour: string;
  user_initials: string | null;
  user_avatar_url: string | null;
  active_tasks: number;
  overdue_tasks: number;
  total_minutes_logged: number;
  total_estimate_minutes: number;
}

export interface Absence {
  id: string;
  type: 'leave' | 'time_off';
  user_id: string;
  user_name: string;
  user_colour: string;
  user_initials: string | null;
  user_avatar_url: string | null;
  start_date: string;
  end_date: string;
  label: string;
  colour: string;
  days?: number;
}

export const timeEntriesApi = {
  create: (workspaceId: string, taskId: string, data: TimeEntryCreate) =>
    api.post<TimeEntry>(`/workspaces/${workspaceId}/tasks/${taskId}/time-entries`, data),

  listForTask: (workspaceId: string, taskId: string) =>
    api.get<TimeEntry[]>(`/workspaces/${workspaceId}/tasks/${taskId}/time-entries`),

  delete: (workspaceId: string, taskId: string, entryId: string) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${entryId}`),

  listAll: (workspaceId: string, params?: { user_id?: string; since?: string; until?: string }) =>
    api.get<TimeEntry[]>(`/workspaces/${workspaceId}/time-entries`, { params }),

  resourceUtilisation: (workspaceId: string, params?: { since?: string; until?: string }) =>
    api.get<ResourceUtilisation[]>(`/workspaces/${workspaceId}/resource-utilisation`, { params }),

  absences: (workspaceId: string, params?: { since?: string; until?: string }) =>
    api.get<Absence[]>(`/workspaces/${workspaceId}/absences`, { params }),
};
