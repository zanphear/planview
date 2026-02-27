import { useEffect } from 'react';
import { Bell, Check, MessageSquare, UserPlus, Clock, AlertTriangle, X } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Avatar } from '../shared/Avatar';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  task_assigned: <UserPlus size={14} />,
  comment_added: <MessageSquare size={14} />,
  milestone_approaching: <Clock size={14} />,
  task_overdue: <AlertTriangle size={14} />,
};

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

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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

  // Group by date
  const groupByDate = (notifs: typeof notifications) => {
    const groups: { label: string; items: typeof notifications }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    for (const n of notifs) {
      const dateStr = new Date(n.created_at).toDateString();
      let label = dateStr;
      if (dateStr === today) label = 'Today';
      else if (dateStr === yesterday) label = 'Yesterday';
      else label = new Date(n.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

      const existing = groups.find((g) => g.label === label);
      if (existing) {
        existing.items.push(n);
      } else {
        groups.push({ label, items: [n] });
      }
    }
    return groups;
  };

  return (
    <>
      {/* Bell button */}
      <button
        onClick={toggle}
        className="p-2 hover:bg-[var(--color-grey-2)] rounded-lg relative transition-colors"
      >
        <Bell size={20} style={{ color: 'var(--color-text)' }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" style={{ backgroundColor: 'var(--color-danger)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Sliding panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed top-0 right-0 bottom-0 w-96 shadow-2xl z-50 flex flex-col border-l animate-slide-in"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Bell size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && workspace && (
                  <button
                    onClick={() => markAllRead(workspace.id)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <Check size={12} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Bell size={40} className="mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>All caught up!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>No notifications yet</p>
                </div>
              ) : (
                groupByDate(notifications).map((group) => (
                  <div key={group.label}>
                    <div className="px-5 py-2 sticky top-0" style={{ backgroundColor: 'var(--color-grey-1)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{group.label}</span>
                    </div>
                    {group.items.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read && workspace) {
                            markRead(workspace.id, [notif.id]);
                          }
                        }}
                        className="w-full text-left px-5 py-3 flex gap-3 transition-colors hover:bg-[var(--color-grey-1)]"
                        style={{
                          backgroundColor: !notif.is_read ? 'var(--color-primary-light)' : undefined,
                        }}
                      >
                        {notif.actor ? (
                          <Avatar
                            name={notif.actor.name}
                            colour={notif.actor.colour}
                            size={36}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-grey-2)' }}>
                            {EVENT_ICONS[notif.event_type] || <Bell size={14} style={{ color: 'var(--color-text-secondary)' }} />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${!notif.is_read ? 'font-medium' : ''}`} style={{ color: 'var(--color-text)' }}>
                            {notif.title}
                          </p>
                          {notif.body && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{notif.body}</p>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatTime(notif.created_at)}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: 'var(--color-primary)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
