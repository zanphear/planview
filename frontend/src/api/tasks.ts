import { api } from './client';
import type { User } from './users';

export interface TaskTag {
  id: string;
  name: string;
  colour: string;
}

export interface TaskProject {
  id: string;
  name: string;
  colour: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  task_id: string;
  created_at: string;
}

export interface SubtaskBrief {
  id: string;
  name: string;
  status: string;
  sort_order: number;
}

export interface Task {
  id: string;
  name: string;
  description: string | null;
  colour: string | null;
  status: string;
  status_emoji: string | null;
  date_from: string | null;
  date_to: string | null;
  start_time: string | null;
  end_time: string | null;
  time_estimate_minutes: number | null;
  time_estimate_mode: string;
  time_logged_minutes: number;
  is_recurring: boolean;
  recurrence_rule: string | null;
  sort_order: number;
  project_id: string | null;
  segment_id: string | null;
  parent_id: string | null;
  workspace_id: string;
  assignees: User[];
  tags: TaskTag[];
  checklists: ChecklistItem[];
  subtasks: SubtaskBrief[];
  project: TaskProject | null;
  created_at: string;
  updated_at: string;
}

export const tasksApi = {
  list: (workspaceId: string, params?: Record<string, string>) =>
    api.get<Task[]>(`/workspaces/${workspaceId}/tasks`, { params }),

  create: (workspaceId: string, data: Partial<Task> & { assignee_ids?: string[]; tag_ids?: string[] }) =>
    api.post<Task>(`/workspaces/${workspaceId}/tasks`, data),

  update: (workspaceId: string, taskId: string, data: Partial<Task> & { assignee_ids?: string[]; tag_ids?: string[] }) =>
    api.put<Task>(`/workspaces/${workspaceId}/tasks/${taskId}`, data),

  delete: (workspaceId: string, taskId: string) =>
    api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`),

  duplicate: (workspaceId: string, taskId: string) =>
    api.post<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/duplicate`),

  bulkUpdate: (workspaceId: string, data: { task_ids: string[] } & Partial<Task> & { assignee_ids?: string[] }) =>
    api.put<Task[]>(`/workspaces/${workspaceId}/tasks`, data),

  reorder: (workspaceId: string, items: { id: string; sort_order: number }[]) =>
    api.put<Task[]>(`/workspaces/${workspaceId}/tasks/reorder`, { items }),
};
