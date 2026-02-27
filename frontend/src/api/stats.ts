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

export const statsApi = {
  get: (workspaceId: string) =>
    api.get<WorkspaceStats>(`/workspaces/${workspaceId}/stats`),
};
