import { api } from './client';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  colour: string | null;
  status: string;
  time_estimate_minutes: number | null;
  checklist_items: { title: string }[] | null;
  tag_names: string[] | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export const templatesApi = {
  list: (workspaceId: string) =>
    api.get<TaskTemplate[]>(`/workspaces/${workspaceId}/templates`),

  create: (workspaceId: string, data: Partial<TaskTemplate>) =>
    api.post<TaskTemplate>(`/workspaces/${workspaceId}/templates`, data),

  update: (workspaceId: string, templateId: string, data: Partial<TaskTemplate>) =>
    api.put<TaskTemplate>(`/workspaces/${workspaceId}/templates/${templateId}`, data),

  delete: (workspaceId: string, templateId: string) =>
    api.delete(`/workspaces/${workspaceId}/templates/${templateId}`),
};
