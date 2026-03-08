import { api } from './client';

export interface DevelopmentGoal {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  goal_type: string;
  linked_competency_id: string | null;
  target_date: string | null;
  status: string;
  evidence: string | null;
  cost_estimate: number | null;
  priority: string | null;
  progress: number;
  year: number | null;
  linked_objective_id: string | null;
  actual_cost: number | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevelopmentMilestone {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  target_date: string;
  completed_date: string | null;
  status: string;
  year: number;
  sort_order: number;
  created_at: string;
}

export interface DevelopmentCheckpoint {
  id: string;
  plan_id: string;
  checkpoint_date: string;
  reviewer_id: string | null;
  notes: string | null;
  overall_assessment: string;
  actions: unknown[] | null;
  created_at: string;
}

export interface CareerPathway {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  levels: Array<{ title: string; typical_years?: number; required_competencies?: string[] }> | null;
  created_at: string;
  updated_at: string;
}

export interface DevelopmentPlan {
  id: string;
  workspace_id: string;
  user_id: string;
  review_period_id: string | null;
  status: string;
  career_aspiration: string | null;
  horizon_years: number | null;
  start_date: string | null;
  end_date: string | null;
  career_pathway_id: string | null;
  overall_progress: number;
  total_budget: number | null;
  goals: DevelopmentGoal[];
  milestones: DevelopmentMilestone[];
  checkpoints: DevelopmentCheckpoint[];
  created_at: string;
  updated_at: string;
}

export interface SkillsGapItem {
  competency_id: string;
  competency_name: string;
  required_level: string | null;
  current_level: string | null;
  gap: boolean;
}

const base = (ws: string) => `/workspaces/${ws}/development`;

export const developmentApi = {
  list: (workspaceId: string, params?: { user_id?: string }) =>
    api.get<DevelopmentPlan[]>(base(workspaceId), { params }),

  create: (workspaceId: string, data: { user_id: string; review_period_id?: string; career_aspiration?: string; horizon_years?: number; start_date?: string; end_date?: string; career_pathway_id?: string; total_budget?: number; goals?: Partial<DevelopmentGoal>[]; milestones?: Partial<DevelopmentMilestone>[] }) =>
    api.post<DevelopmentPlan>(base(workspaceId), data),

  update: (workspaceId: string, planId: string, data: Partial<DevelopmentPlan>) =>
    api.put<DevelopmentPlan>(`${base(workspaceId)}/${planId}`, data),

  addGoal: (workspaceId: string, planId: string, data: Partial<DevelopmentGoal>) =>
    api.post<DevelopmentGoal>(`${base(workspaceId)}/${planId}/goals`, data),

  updateGoal: (workspaceId: string, planId: string, goalId: string, data: Partial<DevelopmentGoal>) =>
    api.put<DevelopmentGoal>(`${base(workspaceId)}/${planId}/goals/${goalId}`, data),

  // Milestones
  addMilestone: (workspaceId: string, planId: string, data: Partial<DevelopmentMilestone>) =>
    api.post<DevelopmentMilestone>(`${base(workspaceId)}/${planId}/milestones`, data),

  updateMilestone: (workspaceId: string, planId: string, milestoneId: string, data: Partial<DevelopmentMilestone>) =>
    api.put<DevelopmentMilestone>(`${base(workspaceId)}/${planId}/milestones/${milestoneId}`, data),

  deleteMilestone: (workspaceId: string, planId: string, milestoneId: string) =>
    api.delete(`${base(workspaceId)}/${planId}/milestones/${milestoneId}`),

  // Checkpoints
  listCheckpoints: (workspaceId: string, planId: string) =>
    api.get<DevelopmentCheckpoint[]>(`${base(workspaceId)}/${planId}/checkpoints`),

  addCheckpoint: (workspaceId: string, planId: string, data: Partial<DevelopmentCheckpoint>) =>
    api.post<DevelopmentCheckpoint>(`${base(workspaceId)}/${planId}/checkpoints`, data),

  updateCheckpoint: (workspaceId: string, planId: string, checkpointId: string, data: Partial<DevelopmentCheckpoint>) =>
    api.put<DevelopmentCheckpoint>(`${base(workspaceId)}/${planId}/checkpoints/${checkpointId}`, data),

  // Career Pathways
  listPathways: (workspaceId: string) =>
    api.get<CareerPathway[]>(`${base(workspaceId)}/pathways`),

  createPathway: (workspaceId: string, data: Partial<CareerPathway>) =>
    api.post<CareerPathway>(`${base(workspaceId)}/pathways`, data),

  updatePathway: (workspaceId: string, pathwayId: string, data: Partial<CareerPathway>) =>
    api.put<CareerPathway>(`${base(workspaceId)}/pathways/${pathwayId}`, data),

  deletePathway: (workspaceId: string, pathwayId: string) =>
    api.delete(`${base(workspaceId)}/pathways/${pathwayId}`),

  // Skills Gap
  skillsGap: (workspaceId: string, planId: string) =>
    api.get<SkillsGapItem[]>(`${base(workspaceId)}/${planId}/skills-gap`),

  // Timeline
  timeline: (workspaceId: string, params?: { user_id?: string }) =>
    api.get(`${base(workspaceId)}/timeline`, { params }),
};
