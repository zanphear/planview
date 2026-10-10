import { api } from './client';

export interface ProjectStat {
  id: string;
  name: string;
  colour: string;
  total: number;
  completed: number;
}

export interface WorkloadStat {
  id: string;
  name: string;
  colour: string;
  total: number;
  completed: number;
}

export interface WorkspaceStats {
  total_tasks: number;
  by_status: Record<string, number>;
  overdue: number;
  due_this_week: number;
  unassigned: number;
  created_this_week: number;
  completed_this_week: number;
  projects: ProjectStat[];
  workload: WorkloadStat[];
}

export interface BurndownPoint {
  date: string;
  created: number;
  completed: number;
  remaining: number;
}

export interface BurndownData {
  points: BurndownPoint[];
  days: number;
}

export interface PeopleStats {
  people: { total: number; by_department: Record<string, number> };
  meetings: { this_month: number; completed: number; upcoming: number; completion_rate: number };
  objectives: { total: number; by_status: Record<string, number>; average_progress: number };
  compliance: {
    valid: number;
    expiring_soon: number;
    expired: number;
    total: number;
    by_type: Record<string, number>;
  };
  competencies: {
    total_skills: number;
    by_level: Record<string, number>;
    total_assignments: number;
  };
  leave: { pending_requests: number; approved_this_month: number; total_allowances: number };
  recruitment: { total: number; by_stage: Record<string, number>; active: number };
  development: {
    total_plans: number;
    active_plans: number;
    total_goals: number;
    completed_goals: number;
    completion_rate: number;
  };
  reviews: {
    total_cycles: number;
    total_reviews: number;
    avg_rating: number | null;
    completed: number;
  };
  wellbeing: {
    avg_morale: number | null;
    avg_workload: number | null;
    avg_support: number | null;
    total_kudos: number;
    recent_kudos: number;
  };
  onboarding: { active_checklists: number; avg_progress: number };
}

export const statsApi = {
  get: (workspaceId: string) => api.get<WorkspaceStats>(`/workspaces/${workspaceId}/stats`),

  burndown: (workspaceId: string, days?: number, projectId?: string) =>
    api.get<BurndownData>(`/workspaces/${workspaceId}/stats/burndown`, {
      params: { days: days || 30, ...(projectId ? { project_id: projectId } : {}) },
    }),

  peopleDashboard: (workspaceId: string) =>
    api.get<PeopleStats>(`/workspaces/${workspaceId}/people-stats`),
};
