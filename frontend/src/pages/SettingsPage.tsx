import { useState, useEffect } from 'react';
import { User, Palette, Bell, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { membersApi } from '../api/users';
import { ColourPicker } from '../components/task/ColourPicker';

type Tab = 'profile' | 'workspace' | 'notifications';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name || '');
  const [colour, setColour] = useState(user?.colour || '#4186E0');
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
    await membersApi.update(workspace.id, user.id, { name, colour });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'workspace', label: 'Workspace', icon: <Shield size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Settings</h2>

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
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <hr className="my-3 border-gray-100" />
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {tab === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800">Profile Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Display Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <Palette size={14} className="inline mr-1" />
                  Profile Colour
                </label>
                <ColourPicker value={colour} onChange={setColour} />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'workspace' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800">Workspace Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Workspace Name</label>
                <input
                  value={workspace?.name || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                />
              </div>
              <p className="text-sm text-gray-400">
                More workspace settings will be available in a future update.
              </p>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-lg font-medium text-gray-800">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'Task assigned to me', key: 'task_assigned' },
                  { label: 'Comment on my tasks', key: 'comment_added' },
                  { label: 'Task status changes', key: 'status_changed' },
                ].map(({ label, key }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-500 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Notification preferences are stored locally for now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
