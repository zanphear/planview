import { api } from './client';

export interface CustomField {
  id: string;
  name: string;
  field_type: string;
  options: string | null;
  sort_order: number;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  field_id: string;
  task_id: string;
  value: string | null;
  created_at: string;
}

export const customFieldsApi = {
  list: (workspaceId: string) =>
    api.get<CustomField[]>(`/workspaces/${workspaceId}/custom-fields`),

  create: (workspaceId: string, data: { name: string; field_type?: string; options?: string }) =>
    api.post<CustomField>(`/workspaces/${workspaceId}/custom-fields`, data),

  update: (workspaceId: string, fieldId: string, data: Partial<CustomField>) =>
    api.put<CustomField>(`/workspaces/${workspaceId}/custom-fields/${fieldId}`, data),

  delete: (workspaceId: string, fieldId: string) =>
    api.delete(`/workspaces/${workspaceId}/custom-fields/${fieldId}`),

  getValues: (workspaceId: string, taskId: string) =>
    api.get<CustomFieldValue[]>(`/workspaces/${workspaceId}/custom-fields/tasks/${taskId}/values`),

  setValues: (workspaceId: string, taskId: string, data: { field_id: string; value: string | null }[]) =>
    api.put<CustomFieldValue[]>(`/workspaces/${workspaceId}/custom-fields/tasks/${taskId}/values`, data),
};
