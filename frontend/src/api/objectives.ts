import { api } from './client';

export interface ReviewPeriod {
  id: string;
  workspace_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  measurement_type: string;
  created_at: string;
}

export interface Objective {
  id: string;
  workspace_id: string;
  user_id: string;
  review_period_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  progress: number;
  weight: number;
  key_results: KeyResult[];
  created_at: string;
  updated_at: string;
}

export const objectivesApi = {
  // Review periods
  listPeriods: (workspaceId: string) =>
    api.get<ReviewPeriod[]>(`/workspaces/${workspaceId}/review-periods`),

  createPeriod: (
    workspaceId: string,
    data: { name: string; start_date: string; end_date: string },
  ) => api.post<ReviewPeriod>(`/workspaces/${workspaceId}/review-periods`, data),

  // Objectives
  list: (workspaceId: string, params?: { user_id?: string; period_id?: string }) =>
    api.get<Objective[]>(`/workspaces/${workspaceId}/objectives`, { params }),

  create: (
    workspaceId: string,
    data: Partial<Objective> & { key_results?: Partial<KeyResult>[] },
  ) => api.post<Objective>(`/workspaces/${workspaceId}/objectives`, data),

  update: (workspaceId: string, objectiveId: string, data: Partial<Objective>) =>
    api.put<Objective>(`/workspaces/${workspaceId}/objectives/${objectiveId}`, data),

  delete: (workspaceId: string, objectiveId: string) =>
    api.delete(`/workspaces/${workspaceId}/objectives/${objectiveId}`),

  // Key Results
  addKeyResult: (workspaceId: string, objectiveId: string, data: Partial<KeyResult>) =>
    api.post<KeyResult>(`/workspaces/${workspaceId}/objectives/${objectiveId}/key-results`, data),

  updateKeyResult: (
    workspaceId: string,
    objectiveId: string,
    krId: string,
    data: Partial<KeyResult>,
  ) =>
    api.put<KeyResult>(
      `/workspaces/${workspaceId}/objectives/${objectiveId}/key-results/${krId}`,
      data,
    ),
};
