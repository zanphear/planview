import { api } from './client';

export interface ActivityActor {
  id: string;
  name: string;
  colour: string;
  initials: string | null;
}

export interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  actor: ActivityActor;
  created_at: string;
}

export const activityApi = {
  list: (workspaceId: string, params?: { limit?: number; offset?: number }) =>
    api.get<Activity[]>(`/workspaces/${workspaceId}/activity`, { params }),
};
