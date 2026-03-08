import { api } from './client';

export interface LookupValue {
  id: string;
  workspace_id: string;
  category: string;
  value: string;
  label: string | null;
  colour: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LookupValueCreate {
  value: string;
  label?: string;
  colour?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface LookupValueUpdate {
  value?: string;
  label?: string;
  colour?: string;
  display_order?: number;
  is_active?: boolean;
}

export const lookupsApi = {
  listAll: (workspaceId: string) =>
    api.get<Record<string, LookupValue[]>>(`/workspaces/${workspaceId}/lookups`),

  list: (workspaceId: string, category: string) =>
    api.get<LookupValue[]>(`/workspaces/${workspaceId}/lookups/${category}`),

  create: (workspaceId: string, category: string, data: LookupValueCreate) =>
    api.post<LookupValue>(`/workspaces/${workspaceId}/lookups/${category}`, data),

  update: (workspaceId: string, category: string, id: string, data: LookupValueUpdate) =>
    api.put<LookupValue>(`/workspaces/${workspaceId}/lookups/${category}/${id}`, data),

  delete: (workspaceId: string, category: string, id: string) =>
    api.delete(`/workspaces/${workspaceId}/lookups/${category}/${id}`),

  reorder: (workspaceId: string, category: string, items: { id: string; display_order: number }[]) =>
    api.post(`/workspaces/${workspaceId}/lookups/${category}/reorder`, { items }),
};
