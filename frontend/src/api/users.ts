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
  notification_prefs: Record<string, boolean> | null;
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

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
};

export const membersApi = {
  list: (workspaceId: string) =>
    api.get<User[]>(`/workspaces/${workspaceId}/members`),

  get: (workspaceId: string, userId: string) =>
    api.get<User>(`/workspaces/${workspaceId}/members/${userId}`),

  update: (workspaceId: string, userId: string, data: Partial<User>) =>
    api.put<User>(`/workspaces/${workspaceId}/members/${userId}`, data),

  invite: (workspaceId: string, data: { name: string; email: string; role?: string }) =>
    api.post<{ user: User; temp_password: string }>(`/workspaces/${workspaceId}/members/invite`, data),

  remove: (workspaceId: string, userId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${userId}`),
};
