import { api } from './client';
import type { User } from './users';

export interface Notification {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  actor: User | null;
  task_id: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (workspaceId: string, params?: { unread_only?: boolean }) =>
    api.get<Notification[]>(`/workspaces/${workspaceId}/notifications`, { params }),

  unreadCount: (workspaceId: string) =>
    api.get<{ count: number }>(`/workspaces/${workspaceId}/notifications/unread-count`),

  markRead: (workspaceId: string, notificationIds: string[]) =>
    api.post(`/workspaces/${workspaceId}/notifications/mark-read`, {
      notification_ids: notificationIds,
    }),
};
