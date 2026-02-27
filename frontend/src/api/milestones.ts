import { api } from './client';

export interface Milestone {
  id: string;
  name: string;
  date: string;
  colour: string;
  project_id: string | null;
  workspace_id: string;
  created_at: string;
}

export const milestonesApi = {
  list: (workspaceId: string) =>
    api.get<Milestone[]>(`/workspaces/${workspaceId}/milestones`),

  create: (workspaceId: string, data: { name: string; date: string; colour?: string; project_id?: string }) =>
    api.post<Milestone>(`/workspaces/${workspaceId}/milestones`, data),

  update: (workspaceId: string, milestoneId: string, data: Partial<Milestone>) =>
    api.put<Milestone>(`/workspaces/${workspaceId}/milestones/${milestoneId}`, data),

  delete: (workspaceId: string, milestoneId: string) =>
    api.delete(`/workspaces/${workspaceId}/milestones/${milestoneId}`),
};
