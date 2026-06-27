import { useState } from 'react';
import { Menu, Sun, Moon, Bug, Lightbulb } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from './NotificationBell';
import { Avatar } from '../shared/Avatar';
import { BugReportModal } from '../modals/BugReportModal';
import { FeatureRequestModal } from '../modals/FeatureRequestModal';

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const user = useAuthStore((s) => s.user);
  const [showBugModal, setShowBugModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  return (
    <header className="h-14 bg-topbar border-b border-outline flex items-center justify-between px-4 shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Toggle sidebar">
          <Menu size={20} className="text-foreground" />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Planview</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFeatureModal(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Request a feature"
          aria-label="Request a feature"
        >
          <Lightbulb size={18} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => setShowBugModal(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Report a bug"
          aria-label="Report a bug"
        >
          <Bug size={18} className="text-muted-foreground" />
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun size={18} className="text-muted-foreground" />
          ) : (
            <Moon size={18} className="text-muted-foreground" />
          )}
        </button>
        <NotificationBell />
        {user && (
          <Avatar
            name={user.name}
            initials={user.initials}
            colour={user.colour}
            avatarUrl={user.avatar_url}
            size={32}
          />
        )}
      </div>
      {showBugModal && <BugReportModal onClose={() => setShowBugModal(false)} />}
      {showFeatureModal && <FeatureRequestModal onClose={() => setShowFeatureModal(false)} />}
    </header>
  );
}
