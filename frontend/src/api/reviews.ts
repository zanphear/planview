import { api } from './client';

export interface ReviewCycle {
  id: string;
  workspace_id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  workspace_id: string;
  cycle_id: string;
  user_id: string;
  reviewer_id: string;
  self_assessment: Record<string, unknown> | null;
  manager_assessment: Record<string, unknown> | null;
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  status: string;
  sign_off_date: string | null;
  created_at: string;
  updated_at: string;
}

export const reviewsApi = {
  // Cycles
  listCycles: (workspaceId: string) =>
    api.get<ReviewCycle[]>(`/workspaces/${workspaceId}/reviews/cycles`),

  createCycle: (workspaceId: string, data: { name: string; period_start: string; period_end: string }) =>
    api.post<ReviewCycle>(`/workspaces/${workspaceId}/reviews/cycles`, data),

  updateCycle: (workspaceId: string, cycleId: string, data: Partial<ReviewCycle>) =>
    api.put<ReviewCycle>(`/workspaces/${workspaceId}/reviews/cycles/${cycleId}`, data),

  // Reviews
  list: (workspaceId: string, params?: { cycle_id?: string; user_id?: string }) =>
    api.get<Review[]>(`/workspaces/${workspaceId}/reviews`, { params }),

  create: (workspaceId: string, cycleId: string, data: { user_id: string; reviewer_id: string }) =>
    api.post<Review>(`/workspaces/${workspaceId}/reviews`, data, { params: { cycle_id: cycleId } }),

  update: (workspaceId: string, reviewId: string, data: Partial<Review>) =>
    api.put<Review>(`/workspaces/${workspaceId}/reviews/${reviewId}`, data),
};
