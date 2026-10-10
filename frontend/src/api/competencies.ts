import { api } from './client';

export interface Competency {
  id: string;
  workspace_id: string;
  name: string;
  category: string | null;
  description: string | null;
  requires_certification: boolean;
  certification_validity_months: number | null;
  levels: string[] | null;
  created_at: string;
}

export interface UserCompetency {
  id: string;
  workspace_id: string;
  user_id: string;
  competency_id: string;
  level: string;
  assessed_date: string | null;
  assessed_by: string | null;
  expiry_date: string | null;
  notes: string | null;
  competency_name: string | null;
  competency_category: string | null;
  created_at: string;
}

export const competenciesApi = {
  list: (workspaceId: string, params?: { category?: string }) =>
    api.get<Competency[]>(`/workspaces/${workspaceId}/competencies`, { params }),

  create: (workspaceId: string, data: Partial<Competency>) =>
    api.post<Competency>(`/workspaces/${workspaceId}/competencies`, data),

  update: (workspaceId: string, competencyId: string, data: Partial<Competency>) =>
    api.put<Competency>(`/workspaces/${workspaceId}/competencies/${competencyId}`, data),

  delete: (workspaceId: string, competencyId: string) =>
    api.delete(`/workspaces/${workspaceId}/competencies/${competencyId}`),

  // Skills matrix
  matrix: (workspaceId: string, params?: { user_id?: string }) =>
    api.get<UserCompetency[]>(`/workspaces/${workspaceId}/competencies/matrix`, { params }),

  assess: (
    workspaceId: string,
    competencyId: string,
    data: { user_id: string; level: string; notes?: string },
  ) =>
    api.post<UserCompetency>(
      `/workspaces/${workspaceId}/competencies/${competencyId}/assess`,
      data,
    ),

  updateAssessment: (
    workspaceId: string,
    competencyId: string,
    assessmentId: string,
    data: Partial<UserCompetency>,
  ) =>
    api.put<UserCompetency>(
      `/workspaces/${workspaceId}/competencies/${competencyId}/assessments/${assessmentId}`,
      data,
    ),
};
