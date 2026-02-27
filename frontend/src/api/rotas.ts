import { api } from './client';

export interface Rota {
  id: string;
  name: string;
  rota_type: 'callout' | 'weekday' | '24hour';
  start_time: string | null;
  end_time: string | null;
  include_weekends: boolean;
  colour: string;
  workspace_id: string;
  entries: RotaEntry[];
  created_at: string;
  updated_at: string;
}

export interface RotaEntry {
  id: string;
  rota_id: string;
  user_id: string;
  workspace_id: string;
  date_from: string;
  date_to: string;
  notes: string | null;
  user: { id: string; name: string; colour: string; initials: string | null } | null;
  created_at: string;
}

export const rotasApi = {
  list: (workspaceId: string, rotaType?: string) =>
    api.get<Rota[]>(`/workspaces/${workspaceId}/rotas`, { params: rotaType ? { rota_type: rotaType } : undefined }),

  get: (workspaceId: string, rotaId: string) =>
    api.get<Rota>(`/workspaces/${workspaceId}/rotas/${rotaId}`),

  create: (workspaceId: string, data: Partial<Rota>) =>
    api.post<Rota>(`/workspaces/${workspaceId}/rotas`, data),

  update: (workspaceId: string, rotaId: string, data: Partial<Rota>) =>
    api.put<Rota>(`/workspaces/${workspaceId}/rotas/${rotaId}`, data),

  delete: (workspaceId: string, rotaId: string) =>
    api.delete(`/workspaces/${workspaceId}/rotas/${rotaId}`),

  createEntry: (workspaceId: string, rotaId: string, data: { user_id: string; date_from: string; date_to: string; notes?: string }) =>
    api.post<RotaEntry>(`/workspaces/${workspaceId}/rotas/${rotaId}/entries`, data),

  updateEntry: (workspaceId: string, rotaId: string, entryId: string, data: Partial<RotaEntry>) =>
    api.put<RotaEntry>(`/workspaces/${workspaceId}/rotas/${rotaId}/entries/${entryId}`, data),

  deleteEntry: (workspaceId: string, rotaId: string, entryId: string) =>
    api.delete(`/workspaces/${workspaceId}/rotas/${rotaId}/entries/${entryId}`),
};
