import { api } from './client';

export interface LeaveAllowance {
  id: string;
  workspace_id: string;
  user_id: string;
  year: number;
  entitlement_days: number;
  carried_forward: number;
  used_days: number;
  booked_days: number;
  remaining: number;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  workspace_id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const leaveApi = {
  // Allowances
  listAllowances: (workspaceId: string, params?: { user_id?: string; year?: number }) =>
    api.get<LeaveAllowance[]>(`/workspaces/${workspaceId}/leave/allowances`, { params }),

  createAllowance: (workspaceId: string, data: Partial<LeaveAllowance>) =>
    api.post<LeaveAllowance>(`/workspaces/${workspaceId}/leave/allowances`, data),

  // Requests
  listRequests: (workspaceId: string, params?: { user_id?: string; status?: string }) =>
    api.get<LeaveRequest[]>(`/workspaces/${workspaceId}/leave/requests`, { params }),

  createRequest: (
    workspaceId: string,
    data: {
      leave_type: string;
      start_date: string;
      end_date: string;
      days: number;
      notes?: string;
    },
  ) => api.post<LeaveRequest>(`/workspaces/${workspaceId}/leave/requests`, data),

  updateRequest: (workspaceId: string, requestId: string, data: Partial<LeaveRequest>) =>
    api.put<LeaveRequest>(`/workspaces/${workspaceId}/leave/requests/${requestId}`, data),
};
