import { api } from './client';

export interface Meeting {
  id: string;
  workspace_id: string;
  manager_id: string;
  report_id: string;
  scheduled_date: string;
  actual_date: string | null;
  notes: string | null;
  mood: string | null;
  status: string;
  actions: MeetingAction[];
  created_at: string;
  updated_at: string;
}

export interface MeetingAction {
  id: string;
  meeting_id: string;
  title: string;
  status: string;
  owner_id: string | null;
  carried_from_id: string | null;
  created_at: string;
}

export const meetingsApi = {
  list: (
    workspaceId: string,
    params?: { report_id?: string; manager_id?: string; status?: string },
  ) => api.get<Meeting[]>(`/workspaces/${workspaceId}/meetings`, { params }),

  create: (
    workspaceId: string,
    data: { report_id: string; scheduled_date: string; notes?: string },
  ) => api.post<Meeting>(`/workspaces/${workspaceId}/meetings`, data),

  get: (workspaceId: string, meetingId: string) =>
    api.get<Meeting>(`/workspaces/${workspaceId}/meetings/${meetingId}`),

  update: (workspaceId: string, meetingId: string, data: Partial<Meeting>) =>
    api.put<Meeting>(`/workspaces/${workspaceId}/meetings/${meetingId}`, data),

  addAction: (workspaceId: string, meetingId: string, data: { title: string; owner_id?: string }) =>
    api.post<MeetingAction>(`/workspaces/${workspaceId}/meetings/${meetingId}/actions`, data),

  updateAction: (
    workspaceId: string,
    meetingId: string,
    actionId: string,
    data: Partial<MeetingAction>,
  ) =>
    api.put<MeetingAction>(
      `/workspaces/${workspaceId}/meetings/${meetingId}/actions/${actionId}`,
      data,
    ),

  carryForward: (workspaceId: string, meetingId: string, targetMeetingId: string) =>
    api.post<Meeting>(`/workspaces/${workspaceId}/meetings/${meetingId}/carry-forward`, null, {
      params: { target_meeting_id: targetMeetingId },
    }),
};
