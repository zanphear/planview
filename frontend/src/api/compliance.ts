import { api } from './client';

export interface ComplianceItem {
  id: string;
  workspace_id: string;
  user_id: string;
  item_type: string;
  title: string;
  reference_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  alert_days: number[];
  document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const complianceApi = {
  list: (workspaceId: string, params?: { user_id?: string; status?: string; item_type?: string }) =>
    api.get<ComplianceItem[]>(`/workspaces/${workspaceId}/compliance`, { params }),

  create: (workspaceId: string, data: Partial<ComplianceItem>) =>
    api.post<ComplianceItem>(`/workspaces/${workspaceId}/compliance`, data),

  update: (workspaceId: string, itemId: string, data: Partial<ComplianceItem>) =>
    api.put<ComplianceItem>(`/workspaces/${workspaceId}/compliance/${itemId}`, data),

  delete: (workspaceId: string, itemId: string) =>
    api.delete(`/workspaces/${workspaceId}/compliance/${itemId}`),
};
