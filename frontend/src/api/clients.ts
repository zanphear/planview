import { api } from './client';

export interface Client {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export const clientsApi = {
  list: (workspaceId: string) =>
    api.get<Client[]>(`/workspaces/${workspaceId}/clients`),

  create: (workspaceId: string, data: { name: string }) =>
    api.post<Client>(`/workspaces/${workspaceId}/clients`, data),

  update: (workspaceId: string, clientId: string, data: Partial<Client>) =>
    api.put<Client>(`/workspaces/${workspaceId}/clients/${clientId}`, data),

  delete: (workspaceId: string, clientId: string) =>
    api.delete(`/workspaces/${workspaceId}/clients/${clientId}`),
};
