import { api } from './client';
import type { Task } from './tasks';

export const timelineApi = {
  get: (workspaceId: string, params: { since: string; until: string; users?: string; project?: string }) =>
    api.get<Task[]>(`/workspaces/${workspaceId}/timeline`, { params }),
};
