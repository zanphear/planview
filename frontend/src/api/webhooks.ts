import { api } from './client';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[] | null;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  event: string;
  payload: Record<string, unknown> | null;
  response_status: number | null;
  success: boolean;
  webhook_id: string;
  created_at: string;
}

export const webhooksApi = {
  list: (workspaceId: string) =>
    api.get<Webhook[]>(`/workspaces/${workspaceId}/webhooks`),

  create: (workspaceId: string, data: { name: string; url: string; secret?: string; events?: string[] }) =>
    api.post<Webhook>(`/workspaces/${workspaceId}/webhooks`, data),

  update: (workspaceId: string, webhookId: string, data: Partial<Webhook>) =>
    api.put<Webhook>(`/workspaces/${workspaceId}/webhooks/${webhookId}`, data),

  delete: (workspaceId: string, webhookId: string) =>
    api.delete(`/workspaces/${workspaceId}/webhooks/${webhookId}`),

  logs: (workspaceId: string, webhookId: string) =>
    api.get<WebhookLog[]>(`/workspaces/${workspaceId}/webhooks/${webhookId}/logs`),
};
