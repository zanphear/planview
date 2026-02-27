import { api } from './client';
import type { User } from './users';

export interface Team {
  id: string;
  name: string;
  is_favourite: boolean;
  workspace_id: string;
  members: User[];
  created_at: string;
  updated_at: string;
}

export const teamsApi = {
  list: (workspaceId: string) =>
    api.get<Team[]>(`/workspaces/${workspaceId}/teams`),

  create: (workspaceId: string, data: { name: string }) =>
    api.post<Team>(`/workspaces/${workspaceId}/teams`, data),

  update: (workspaceId: string, teamId: string, data: Partial<Team>) =>
    api.put<Team>(`/workspaces/${workspaceId}/teams/${teamId}`, data),

  delete: (workspaceId: string, teamId: string) =>
    api.delete(`/workspaces/${workspaceId}/teams/${teamId}`),

  addMember: (workspaceId: string, teamId: string, userId: string) =>
    api.post<Team>(`/workspaces/${workspaceId}/teams/${teamId}/members`, { user_id: userId }),

  removeMember: (workspaceId: string, teamId: string, userId: string) =>
    api.delete(`/workspaces/${workspaceId}/teams/${teamId}/members/${userId}`),
};
