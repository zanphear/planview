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

export const statsApi = {
  get: (workspaceId: string) =>
    api.get<WorkspaceStats>(`/workspaces/${workspaceId}/stats`),

  burndown: (workspaceId: string, days?: number, projectId?: string) =>
    api.get<BurndownData>(`/workspaces/${workspaceId}/stats/burndown`, {
      params: { days: days || 30, ...(projectId ? { project_id: projectId } : {}) },
    }),
};
