import { api } from './client';

export interface Project {
  id: string;
  name: string;
  colour: string;
  status: string;
  is_favourite: boolean;
  custom_statuses: unknown;
  client_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export const projectsApi = {
  list: (workspaceId: string) =>
    api.get<Project[]>(`/workspaces/${workspaceId}/projects`),

  create: (workspaceId: string, data: { name: string; colour?: string; client_id?: string }) =>
    api.post<Project>(`/workspaces/${workspaceId}/projects`, data),

  update: (workspaceId: string, projectId: string, data: Partial<Project>) =>
    api.put<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, data),

  delete: (workspaceId: string, projectId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}`),
};
