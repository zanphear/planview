import { api } from './client';

export interface User {
  id: string;
  name: string;
  email: string | null;
  initials: string | null;
  colour: string;
  avatar_url: string | null;
  role: string;
  pin_on_top: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string; workspace_name?: string }) =>
    api.post<TokenResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>('/auth/login', data),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }),

  me: () => api.get<User>('/auth/me'),
};

export const membersApi = {
  list: (workspaceId: string) =>
    api.get<User[]>(`/workspaces/${workspaceId}/members`),

  get: (workspaceId: string, userId: string) =>
    api.get<User>(`/workspaces/${workspaceId}/members/${userId}`),

  update: (workspaceId: string, userId: string, data: Partial<User>) =>
    api.put<User>(`/workspaces/${workspaceId}/members/${userId}`, data),
};
