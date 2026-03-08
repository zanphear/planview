import { api } from './client';

export interface PulseResponse {
  id: string;
  survey_id: string;
  user_id: string;
  morale: number;
  workload: number;
  support: number;
  comments: string | null;
  created_at: string;
}

export interface PulseSurvey {
  id: string;
  workspace_id: string;
  title: string;
  status: string;
  end_date: string | null;
  responses: PulseResponse[];
  created_at: string;
}

export interface Kudos {
  id: string;
  workspace_id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  created_at: string;
}

export const wellbeingApi = {
  // Surveys
  listSurveys: (workspaceId: string) =>
    api.get<PulseSurvey[]>(`/workspaces/${workspaceId}/wellbeing/surveys`),

  createSurvey: (workspaceId: string, data: { title: string; end_date?: string }) =>
    api.post<PulseSurvey>(`/workspaces/${workspaceId}/wellbeing/surveys`, data),

  submitResponse: (workspaceId: string, surveyId: string, data: { morale: number; workload: number; support: number; comments?: string }) =>
    api.post<PulseResponse>(`/workspaces/${workspaceId}/wellbeing/surveys/${surveyId}/respond`, data),

  // Kudos
  listKudos: (workspaceId: string) =>
    api.get<Kudos[]>(`/workspaces/${workspaceId}/wellbeing/kudos`),

  giveKudos: (workspaceId: string, data: { to_user_id: string; message: string }) =>
    api.post<Kudos>(`/workspaces/${workspaceId}/wellbeing/kudos`, data),
};
