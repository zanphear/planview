import { Menu } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from './NotificationBell';

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Planview</h1>
      </div>
      <div className="flex items-center gap-3">
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
