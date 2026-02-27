import { useState, useEffect, useRef } from 'react';
import { User, Palette, Bell, Shield, LogOut, Sun, Moon, Users, UserPlus, Trash2, Copy, Check, Download, Upload, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUIStore } from '../stores/uiStore';
import { authApi, membersApi, type User as UserType } from '../api/users';
import { workspacesApi } from '../api/workspaces';
import { importsApi } from '../api/imports';
import { ColourPicker } from '../components/task/ColourPicker';
import { Avatar } from '../components/shared/Avatar';
import { Toast } from '../components/shared/Toast';

type Tab = 'profile' | 'workspace' | 'members' | 'appearance' | 'notifications' | 'data';

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
  const [members, setMembers] = useState<UserType[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);

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
      Toast.show('Profile updated');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Toast.show('Failed to save profile');
    }
    setSaving(false);
  };

  useEffect(() => {
    if (workspace) {
      membersApi.list(workspace.id).then((res) => setMembers(res.data));
    }
  }, [workspace]);

  const handleInvite = async () => {
    if (!workspace || !inviteName.trim() || !inviteEmail.trim()) return;
    try {
      const { data } = await membersApi.invite(workspace.id, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers((prev) => [...prev, data.user]);
      setTempPassword(data.temp_password);
      setInviteName('');
      setInviteEmail('');
      setInviting(false);
      Toast.show('Member invited');
    } catch {
      Toast.show('Invite failed');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspace) return;
    try {
      await membersApi.remove(workspace.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      Toast.show('Member removed');
    } catch {
      Toast.show('Failed to remove member');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'members', label: 'Members', icon: <Users size={16} /> },
    { id: 'workspace', label: 'Workspace', icon: <Shield size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'data', label: 'Import / Export', icon: <Download size={16} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6">
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

              {/* Change Password */}
              <ChangePasswordForm />
            </div>
          )}

          {tab === 'workspace' && (
            <WorkspaceTab user={user} workspace={workspace} logout={logout} />
          )}

          {tab === 'members' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Members</h3>
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <button
                    onClick={() => setInviting(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <UserPlus size={14} />
                    Invite
                  </button>
                )}
              </div>

              {/* Invite form */}
              {inviting && (
                <div
                  className="p-4 rounded-lg border space-y-3"
                  style={{ backgroundColor: 'var(--color-grey-1)', borderColor: 'var(--color-border)' }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      autoFocus
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    />
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="px-3 py-2 text-sm border rounded-lg outline-none"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={!inviteName.trim() || !inviteEmail.trim()}
                      className="px-3 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      Send Invite
                    </button>
                    <button
                      onClick={() => { setInviting(false); setInviteName(''); setInviteEmail(''); }}
                      className="px-3 py-2 text-sm rounded-lg"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Temp password display */}
              {tempPassword && (
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Member invited! Share this temporary password:
                  </p>
                  <div className="flex items-center gap-2">
                    <code
                      className="px-3 py-1.5 rounded text-sm font-mono flex-1"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                    >
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        setCopiedPw(true);
                        setTimeout(() => setCopiedPw(false), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-grey-2)]"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {copiedPw ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={() => { setTempPassword(null); setCopiedPw(false); }}
                    className="text-xs mt-2 underline"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Member list */}
              <div className="space-y-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors group"
                  >
                    <Avatar name={m.name} initials={m.initials || undefined} colour={m.colour} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {m.name}
                        {m.id === user?.id && (
                          <span className="text-xs ml-2" style={{ color: 'var(--color-text-secondary)' }}>(you)</span>
                        )}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{m.email}</p>
                    </div>
                    {/* Role badge or dropdown */}
                    {m.role === 'owner' || m.id === user?.id || !['owner', 'admin'].includes(user?.role || '') ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: m.role === 'owner' ? 'var(--color-primary-light)' : 'var(--color-grey-2)',
                          color: m.role === 'owner' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {m.role}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={async (e) => {
                          if (!workspace) return;
                          try {
                            const { data } = await membersApi.update(workspace.id, m.id, { role: e.target.value } as Partial<UserType>);
                            setMembers((prev) => prev.map((p) => (p.id === m.id ? data : p)));
                          } catch (err) {
                            console.error('Failed to change role:', err);
                          }
                        }}
                        className="text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer"
                        style={{
                          backgroundColor: 'var(--color-grey-2)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                    {(user?.role === 'owner' || user?.role === 'admin') && m.id !== user?.id && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-grey-2)] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-danger, #ef4444)' }}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
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
            <NotificationPrefsTab user={user} workspace={workspace} fetchMe={fetchMe} />
          )}

          {tab === 'data' && (
            <DataTab workspaceId={workspace?.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: currentPw, new_password: newPw });
      Toast.show('Password changed');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch {
      setError('Current password is incorrect');
    }
    setSaving(false);
  };

  return (
    <div className="pt-5 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
      <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Change Password</h4>
      <input
        type="password"
        value={currentPw}
        onChange={(e) => setCurrentPw(e.target.value)}
        placeholder="Current password"
        className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="New password"
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="Confirm new password"
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={saving || !currentPw || !newPw || !confirmPw}
        className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {saving ? 'Changing...' : 'Change Password'}
      </button>
    </div>
  );
}

const NOTIFICATION_OPTIONS = [
  { key: 'task_assigned', label: 'Task assigned to me', desc: 'Get notified when someone assigns you to a task' },
  { key: 'comment_added', label: 'Comment on my tasks', desc: 'Get notified when someone comments on a task you\'re assigned to' },
  { key: 'status_changed', label: 'Task status changes', desc: 'Get notified when a task you\'re assigned to changes status' },
  { key: 'milestone_approaching', label: 'Milestone reminders', desc: 'Get notified when a milestone deadline is approaching' },
];

function NotificationPrefsTab({ user, workspace, fetchMe }: { user: UserType | null; workspace: { id: string } | null; fetchMe: () => Promise<void> }) {
  const prefs = user?.notification_prefs || {};
  const getChecked = (key: string) => prefs[key] !== false; // default true

  const handleToggle = async (key: string) => {
    if (!workspace || !user) return;
    const newPrefs = { ...prefs, [key]: !getChecked(key) };
    try {
      await membersApi.update(workspace.id, user.id, { notification_prefs: newPrefs } as Partial<UserType>);
      await fetchMe();
      Toast.show('Preferences saved');
    } catch {
      Toast.show('Failed to save preferences');
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Notification Preferences</h3>
      <div className="space-y-3">
        {NOTIFICATION_OPTIONS.map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors">
            <input
              type="checkbox"
              checked={getChecked(key)}
              onChange={() => handleToggle(key)}
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
        Preferences are saved to your account and sync across devices.
      </p>
    </div>
  );
}

interface WorkspaceTabProps {
  user: UserType | null;
  workspace: { id: string; name: string } | null;
  logout: () => void;
}

function WorkspaceTab({ user, workspace, logout }: WorkspaceTabProps) {
  const [wsName, setWsName] = useState(workspace?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);

  const isOwner = user?.role === 'owner';

  const handleSaveName = async () => {
    if (!workspace || !wsName.trim() || wsName === workspace.name) return;
    setSaving(true);
    try {
      await workspacesApi.update(workspace.id, { name: wsName.trim() });
      await fetchWorkspaces();
      setSaved(true);
      Toast.show('Workspace renamed');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Toast.show('Failed to rename workspace');
    }
    setSaving(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || deleteInput !== workspace.name) return;
    try {
      await workspacesApi.delete(workspace.id);
      logout();
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Workspace Settings</h3>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Workspace Name</label>
        <div className="flex gap-2">
          <input
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            disabled={!isOwner}
            className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 disabled:opacity-60"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: isOwner ? 'var(--color-surface)' : 'var(--color-grey-1)',
              color: 'var(--color-text)',
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties}
          />
          {isOwner && wsName !== workspace?.name && wsName.trim() && (
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          )}
        </div>
        {!isOwner && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Only the workspace owner can rename the workspace.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Workspace ID</label>
        <code className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{workspace?.id}</code>
      </div>

      {isOwner && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h4 className="text-sm font-medium text-red-600">Danger Zone</h4>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 size={14} />
              Delete workspace
            </button>
          ) : (
            <div className="p-4 border border-red-300 rounded-lg space-y-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <p className="text-sm text-red-600">
                This will permanently delete the workspace, all projects, teams, tasks, and members. This cannot be undone.
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                Type <strong>{workspace?.name}</strong> to confirm:
              </p>
              <input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={workspace?.name}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteWorkspace}
                  disabled={deleteInput !== workspace?.name}
                  className="px-4 py-1.5 text-sm text-white bg-red-600 rounded-lg disabled:opacity-50 hover:bg-red-700"
                >
                  Delete permanently
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                  className="px-3 py-1.5 text-sm rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataTab({ workspaceId }: { workspaceId?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleExport = async (fmt: string) => {
    if (!workspaceId) return;
    // We need to fetch with auth headers, then trigger download
    const token = localStorage.getItem('access_token');
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/export/tasks.${fmt}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await importsApi.importTasks(workspaceId, file);
      setImportResult(data.message);
    } catch (err) {
      setImportResult('Import failed. Check file format.');
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>Import / Export</h3>

      {/* Export */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Export Tasks</h4>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Download all tasks in your preferred format.
        </p>
        <div className="flex gap-2">
          {['csv', 'json', 'ics'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1.5 hover:bg-[var(--color-grey-1)] transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <Download size={14} />
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ borderColor: 'var(--color-border)' }} />

      {/* Import */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Import Tasks</h4>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Upload a CSV or JSON file. Use the same format as the export.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1.5 hover:bg-[var(--color-grey-1)] transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <Upload size={14} />
          {importing ? 'Importing...' : 'Choose File'}
        </button>
        {importResult && (
          <p className="text-sm mt-2" style={{ color: importResult.includes('failed') ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {importResult}
          </p>
        )}
      </div>
    </div>
  );
}
