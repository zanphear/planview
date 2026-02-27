import { useState, useEffect } from 'react';
import { User, Palette, Bell, Shield, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUIStore } from '../stores/uiStore';
import { membersApi } from '../api/users';
import { ColourPicker } from '../components/task/ColourPicker';
import { Avatar } from '../components/shared/Avatar';

type Tab = 'profile' | 'workspace' | 'appearance' | 'notifications';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const darkMode = useUIStore((s) => s.darkMode);
  const setDarkMode = useUIStore((s) => s.setDarkMode);
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name || '');
  const [colour, setColour] = useState(user?.colour || '#8A00E5');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setColour(user.colour);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!workspace || !user) return;
    setSaving(true);
    try {
      await membersApi.update(workspace.id, user.id, { name, colour });
      await fetchMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
    setSaving(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'workspace', label: 'Workspace', icon: <Shield size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text)' }}>Settings</h2>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                  tab === t.id
                    ? 'bg-[var(--color-primary-light)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-grey-2)]'
                }`}
                style={tab === t.id ? { color: 'var(--color-primary)' } : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <hr className="my-3" style={{ borderColor: 'var(--color-border)' }} />
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-6">
          {tab === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Profile Settings</h3>

              {/* Avatar preview */}
              <div className="flex items-center gap-4">
                <Avatar
                  name={name || user?.name || '?'}
                  colour={colour}
                  size={56}
                />
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>{name || user?.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Role: {user?.role || 'member'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Display Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
                  style={{ borderColor: 'var(--color-border)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg text-sm opacity-60 bg-[var(--color-grey-1)] text-[var(--color-text)]"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Profile Colour</label>
                <ColourPicker value={colour} onChange={setColour} />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'workspace' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Workspace Settings</h3>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Workspace Name</label>
                <input
                  value={workspace?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg text-sm opacity-60 bg-[var(--color-grey-1)] text-[var(--color-text)]"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Workspace ID</label>
                <code className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{workspace?.id}</code>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Danger Zone</h4>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Workspace management features coming in a future update.
                </p>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Appearance</h3>
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>Theme</label>
                <div className="flex gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: <Sun size={20} />, active: !darkMode },
                    { id: 'dark', label: 'Dark', icon: <Moon size={20} />, active: darkMode },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setDarkMode(theme.id === 'dark')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all w-32 ${
                        theme.active
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
                      }`}
                    >
                      <span style={{ color: theme.active ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                        {theme.icon}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Theme preference is stored locally in your browser.
                </p>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'Task assigned to me', key: 'task_assigned', desc: 'Get notified when someone assigns you to a task' },
                  { label: 'Comment on my tasks', key: 'comment_added', desc: 'Get notified when someone comments on a task you\'re assigned to' },
                  { label: 'Task status changes', key: 'status_changed', desc: 'Get notified when a task you\'re assigned to changes status' },
                  { label: 'Milestone reminders', key: 'milestone_approaching', desc: 'Get notified when a milestone deadline is approaching' },
                ].map(({ label, key, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-gray-300 mt-0.5"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Notification preferences are stored locally for now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
