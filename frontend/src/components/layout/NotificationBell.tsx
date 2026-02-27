import { useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Avatar } from '../shared/Avatar';

export function NotificationBell() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const {
    notifications,
    unreadCount,
    isOpen,
    toggle,
    setOpen,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspace) {
      fetchUnreadCount(workspace.id);
    }
  }, [workspace, fetchUnreadCount]);

  useEffect(() => {
    if (isOpen && workspace) {
      fetchNotifications(workspace.id);
    }
  }, [isOpen, workspace, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpen]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        className="p-2 hover:bg-gray-100 rounded-lg relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && workspace && (
              <button
                onClick={() => markAllRead(workspace.id)}
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read && workspace) {
                      markRead(workspace.id, [notif.id]);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 ${
                    !notif.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {notif.actor ? (
                    <Avatar
                      name={notif.actor.name}
                      colour={notif.actor.colour}
                      size={32}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <Bell size={14} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTime(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
