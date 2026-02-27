import { api } from './client';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const workspacesApi = {
  list: () => api.get<Workspace[]>('/workspaces'),

  get: (workspaceId: string) => api.get<Workspace>(`/workspaces/${workspaceId}`),

  create: (data: { name: string }) => api.post<Workspace>('/workspaces', data),

  update: (workspaceId: string, data: { name?: string }) =>
    api.put<Workspace>(`/workspaces/${workspaceId}`, data),

  delete: (workspaceId: string) => api.delete(`/workspaces/${workspaceId}`),
};
