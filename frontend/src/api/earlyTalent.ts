import { api } from './client';

export interface EarlyTalentProgramme {
  id: string;
  workspace_id: string;
  name: string;
  programme_type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  duration_months: number | null;
  status: string;
  max_cohort_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface EarlyTalentCohort {
  id: string;
  programme_id: string;
  name: string;
  intake_date: string;
  expected_end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface EarlyTalentParticipant {
  id: string;
  programme_id: string;
  cohort_id: string | null;
  workspace_id: string;
  user_id: string;
  mentor_id: string | null;
  buddy_id: string | null;
  development_plan_id: string | null;
  status: string;
  qualification_target: string | null;
  university: string | null;
  qualification_level: string | null;
  qualification_progress: number;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EarlyTalentRotation {
  id: string;
  programme_id: string;
  name: string;
  department: string | null;
  duration_weeks: number;
  description: string | null;
  sort_order: number;
  required_competencies: string[] | null;
  created_at: string;
}

export interface EarlyTalentRotationAssignment {
  id: string;
  participant_id: string;
  rotation_id: string;
  supervisor_id: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  assessment: string | null;
  rating: number | null;
  created_at: string;
}

export interface EarlyTalentMilestone {
  id: string;
  participant_id: string;
  title: string;
  description: string | null;
  milestone_type: string;
  target_date: string | null;
  completed_date: string | null;
  status: string;
  evidence: string | null;
  sort_order: number;
  created_at: string;
}

export interface EarlyTalentDashboardStats {
  total_programmes: number;
  active_programmes: number;
  total_participants: number;
  active_participants: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  avg_qualification_progress: number;
  overdue_milestones: number;
  cohort_completion_rate: number;
}

const base = (ws: string) => `/workspaces/${ws}/early-talent`;

export const earlyTalentApi = {
  // Programmes
  listProgrammes: (ws: string) =>
    api.get<EarlyTalentProgramme[]>(`${base(ws)}/programmes`),
  createProgramme: (ws: string, data: Partial<EarlyTalentProgramme>) =>
    api.post<EarlyTalentProgramme>(`${base(ws)}/programmes`, data),
  getProgramme: (ws: string, id: string) =>
    api.get<EarlyTalentProgramme>(`${base(ws)}/programmes/${id}`),
  updateProgramme: (ws: string, id: string, data: Partial<EarlyTalentProgramme>) =>
    api.put<EarlyTalentProgramme>(`${base(ws)}/programmes/${id}`, data),
  deleteProgramme: (ws: string, id: string) =>
    api.delete(`${base(ws)}/programmes/${id}`),

  // Cohorts
  listCohorts: (ws: string, progId: string) =>
    api.get<EarlyTalentCohort[]>(`${base(ws)}/programmes/${progId}/cohorts`),
  createCohort: (ws: string, progId: string, data: Partial<EarlyTalentCohort>) =>
    api.post<EarlyTalentCohort>(`${base(ws)}/programmes/${progId}/cohorts`, data),
  updateCohort: (ws: string, progId: string, id: string, data: Partial<EarlyTalentCohort>) =>
    api.put<EarlyTalentCohort>(`${base(ws)}/programmes/${progId}/cohorts/${id}`, data),

  // Rotations
  listRotations: (ws: string, progId: string) =>
    api.get<EarlyTalentRotation[]>(`${base(ws)}/programmes/${progId}/rotations`),
  createRotation: (ws: string, progId: string, data: Partial<EarlyTalentRotation>) =>
    api.post<EarlyTalentRotation>(`${base(ws)}/programmes/${progId}/rotations`, data),
  updateRotation: (ws: string, progId: string, id: string, data: Partial<EarlyTalentRotation>) =>
    api.put<EarlyTalentRotation>(`${base(ws)}/programmes/${progId}/rotations/${id}`, data),
  deleteRotation: (ws: string, progId: string, id: string) =>
    api.delete(`${base(ws)}/programmes/${progId}/rotations/${id}`),

  // Participants
  listParticipants: (ws: string, params?: { programme_id?: string; cohort_id?: string; status?: string }) =>
    api.get<EarlyTalentParticipant[]>(`${base(ws)}/participants`, { params }),
  createParticipant: (ws: string, data: Partial<EarlyTalentParticipant>) =>
    api.post<EarlyTalentParticipant>(`${base(ws)}/participants`, data),
  getParticipant: (ws: string, id: string) =>
    api.get<EarlyTalentParticipant>(`${base(ws)}/participants/${id}`),
  updateParticipant: (ws: string, id: string, data: Partial<EarlyTalentParticipant>) =>
    api.put<EarlyTalentParticipant>(`${base(ws)}/participants/${id}`, data),
  deleteParticipant: (ws: string, id: string) =>
    api.delete(`${base(ws)}/participants/${id}`),

  // Rotation assignments
  assignRotation: (ws: string, participantId: string, data: Partial<EarlyTalentRotationAssignment>) =>
    api.post<EarlyTalentRotationAssignment>(`${base(ws)}/participants/${participantId}/rotations`, data),
  updateRotationAssignment: (ws: string, participantId: string, id: string, data: Partial<EarlyTalentRotationAssignment>) =>
    api.put<EarlyTalentRotationAssignment>(`${base(ws)}/participants/${participantId}/rotations/${id}`, data),
  deleteRotationAssignment: (ws: string, participantId: string, id: string) =>
    api.delete(`${base(ws)}/participants/${participantId}/rotations/${id}`),

  // Milestones
  createMilestone: (ws: string, participantId: string, data: Partial<EarlyTalentMilestone>) =>
    api.post<EarlyTalentMilestone>(`${base(ws)}/participants/${participantId}/milestones`, data),
  updateMilestone: (ws: string, participantId: string, id: string, data: Partial<EarlyTalentMilestone>) =>
    api.put<EarlyTalentMilestone>(`${base(ws)}/participants/${participantId}/milestones/${id}`, data),
  deleteMilestone: (ws: string, participantId: string, id: string) =>
    api.delete(`${base(ws)}/participants/${participantId}/milestones/${id}`),

  // Stats
  stats: (ws: string) =>
    api.get<EarlyTalentDashboardStats>(`${base(ws)}/stats`),
};
