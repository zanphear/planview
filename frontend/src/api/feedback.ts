import { api } from './client';

export interface FeedbackItem {
  id: string;
  workspace_id: string;
  user_id: string;
  type: 'bug' | 'feature';
  title: string;
  description: string;
  status: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
}

export interface FeedbackCreate {
  type: 'bug' | 'feature';
  title: string;
  description: string;
}

export const feedbackApi = {
  create: (workspaceId: string, data: FeedbackCreate) =>
    api.post<FeedbackItem>(`/workspaces/${workspaceId}/feedback`, data),

  list: (workspaceId: string, params?: { type?: string; status?: string }) =>
    api.get<FeedbackItem[]>(`/workspaces/${workspaceId}/feedback`, { params }),

  get: (workspaceId: string, id: string) =>
    api.get<FeedbackItem>(`/workspaces/${workspaceId}/feedback/${id}`),

  update: (workspaceId: string, id: string, data: { status?: string; resolved_at?: string }) =>
    api.put<FeedbackItem>(`/workspaces/${workspaceId}/feedback/${id}`, data),

  delete: (workspaceId: string, id: string) =>
    api.delete(`/workspaces/${workspaceId}/feedback/${id}`),
};
