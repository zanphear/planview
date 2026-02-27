import { create } from 'zustand';
import { notificationsApi, type Notification } from '../api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  fetchNotifications: (workspaceId: string) => Promise<void>;
  fetchUnreadCount: (workspaceId: string) => Promise<void>;
  markRead: (workspaceId: string, ids: string[]) => Promise<void>;
  markAllRead: (workspaceId: string) => Promise<void>;
  incrementUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  fetchNotifications: async (workspaceId) => {
    const { data } = await notificationsApi.list(workspaceId);
    set({ notifications: data });
  },

  fetchUnreadCount: async (workspaceId) => {
    const { data } = await notificationsApi.unreadCount(workspaceId);
    set({ unreadCount: data.count });
  },

  markRead: async (workspaceId, ids) => {
    await notificationsApi.markRead(workspaceId, ids);
    set((s) => ({
      notifications: s.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - ids.length),
    }));
  },

  markAllRead: async (workspaceId) => {
    const unreadIds = get().notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await notificationsApi.markRead(workspaceId, unreadIds);
    }
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
}));
