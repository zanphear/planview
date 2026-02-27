import { api } from './client';
import type { User } from './users';

export interface Comment {
  id: string;
  body: string;
  task_id: string;
  user_id: string;
  user: User | null;
  created_at: string;
  updated_at: string;
}

export const commentsApi = {
  list: (workspaceId: string, taskId: string) =>
    api.get<Comment[]>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`),

  create: (workspaceId: string, taskId: string, data: { body: string }) =>
    api.post<Comment>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, data),

  update: (workspaceId: string, taskId: string, commentId: string, data: { body: string }) =>
    api.put<Comment>(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`, data),

  delete: (workspaceId: string, taskId: string, commentId: string) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`),
};
