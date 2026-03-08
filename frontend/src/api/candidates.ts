import { api } from './client';

export interface Candidate {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position_applied: string;
  source: string | null;
  status: string;
  applied_date: string;
  notes: string | null;
  events: CandidateEvent[];
  created_at: string;
  updated_at: string;
}

export interface CandidateEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  event_date: string;
  interviewer_id: string | null;
  outcome: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export const candidatesApi = {
  list: (workspaceId: string, params?: { status?: string; position?: string }) =>
    api.get<Candidate[]>(`/workspaces/${workspaceId}/candidates`, { params }),

  create: (workspaceId: string, data: Partial<Candidate>) =>
    api.post<Candidate>(`/workspaces/${workspaceId}/candidates`, data),

  get: (workspaceId: string, candidateId: string) =>
    api.get<Candidate>(`/workspaces/${workspaceId}/candidates/${candidateId}`),

  update: (workspaceId: string, candidateId: string, data: Partial<Candidate>) =>
    api.put<Candidate>(`/workspaces/${workspaceId}/candidates/${candidateId}`, data),

  delete: (workspaceId: string, candidateId: string) =>
    api.delete(`/workspaces/${workspaceId}/candidates/${candidateId}`),

  addEvent: (workspaceId: string, candidateId: string, data: Partial<CandidateEvent>) =>
    api.post<CandidateEvent>(`/workspaces/${workspaceId}/candidates/${candidateId}/events`, data),
};
