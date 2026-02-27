import { api } from './client';

export interface TaskDependency {
  id: string;
  blocker_id: string;
  blocked_id: string;
  dependency_type: string;
  created_at: string;
}

export const dependenciesApi = {
  list: (workspaceId: string, taskId?: string) =>
    api.get<TaskDependency[]>(`/workspaces/${workspaceId}/dependencies`, {
      params: taskId ? { task_id: taskId } : undefined,
    }),

  create: (workspaceId: string, data: { blocker_id: string; blocked_id: string; dependency_type?: string }) =>
    api.post<TaskDependency>(`/workspaces/${workspaceId}/dependencies`, data),

  delete: (workspaceId: string, dependencyId: string) =>
    api.delete(`/workspaces/${workspaceId}/dependencies/${dependencyId}`),
};
