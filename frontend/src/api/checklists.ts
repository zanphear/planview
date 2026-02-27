import { api } from './client';
import type { ChecklistItem } from './tasks';

export const checklistsApi = {
  list: (workspaceId: string, taskId: string) =>
    api.get<ChecklistItem[]>(`/workspaces/${workspaceId}/tasks/${taskId}/checklists`),

  create: (workspaceId: string, taskId: string, data: { title: string }) =>
    api.post<ChecklistItem>(`/workspaces/${workspaceId}/tasks/${taskId}/checklists`, data),

  update: (workspaceId: string, taskId: string, checklistId: string, data: Partial<ChecklistItem>) =>
    api.put<ChecklistItem>(`/workspaces/${workspaceId}/tasks/${taskId}/checklists/${checklistId}`, data),

  delete: (workspaceId: string, taskId: string, checklistId: string) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/checklists/${checklistId}`),
};
