import { Menu, Sun, Moon } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from './NotificationBell';

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 bg-[var(--color-topbar-bg)] border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 hover:bg-[var(--color-grey-2)] rounded-lg transition-colors">
          <Menu size={20} className="text-[var(--color-text)]" />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Planview</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-[var(--color-grey-2)] rounded-lg transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? (
            <Sun size={18} className="text-[var(--color-text-secondary)]" />
          ) : (
            <Moon size={18} className="text-[var(--color-text-secondary)]" />
          )}
        </button>
        <NotificationBell />
        {user && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: user.colour }}
          >
            {user.initials || user.name[0]}
          </div>
        )}
      </div>
    </header>
  );
}
