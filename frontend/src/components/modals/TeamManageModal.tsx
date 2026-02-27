import { useState, useEffect } from 'react';
import { X, Star, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { type Team, teamsApi } from '../../api/teams';
import { membersApi, type User } from '../../api/users';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Avatar } from '../shared/Avatar';

interface TeamManageModalProps {
  team: Team;
  onSave: (updates: Partial<Team>) => void;
  onDelete: () => void;
  onClose: () => void;
  onTeamUpdated: (team: Team) => void;
}

export function TeamManageModal({ team, onSave, onDelete, onClose, onTeamUpdated }: TeamManageModalProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [name, setName] = useState(team.name);
  const [isFavourite, setIsFavourite] = useState(team.is_favourite);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(
    new Set(team.members.map((m) => m.id))
  );

  useEffect(() => {
    if (workspace) {
      membersApi.list(workspace.id).then((res) => setAllMembers(res.data));
    }
  }, [workspace]);

  const handleSave = () => {
    const updates: Partial<Team> = {};
    if (name.trim() && name !== team.name) updates.name = name.trim();
    if (isFavourite !== team.is_favourite) updates.is_favourite = isFavourite;
    if (Object.keys(updates).length > 0) onSave(updates);
    onClose();
  };

  const handleAddMember = async (userId: string) => {
    if (!workspace) return;
    try {
      const { data } = await teamsApi.addMember(workspace.id, team.id, userId);
      setTeamMemberIds((prev) => new Set([...prev, userId]));
      onTeamUpdated(data);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace) return;
    try {
      await teamsApi.removeMember(workspace.id, team.id, userId);
      setTeamMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      // Re-fetch team to get updated member list
      const { data } = await teamsApi.update(workspace.id, team.id, {});
      onTeamUpdated(data);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const currentMembers = allMembers.filter((m) => teamMemberIds.has(m.id));
  const availableMembers = allMembers.filter((m) => !teamMemberIds.has(m.id));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] rounded-xl shadow-2xl z-50 border flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Manage Team</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Team Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>

          {/* Favourite toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setIsFavourite(!isFavourite)}
              className="p-1 rounded"
              style={{ color: isFavourite ? '#f59e0b' : 'var(--color-text-secondary)' }}
            >
              <Star size={18} fill={isFavourite ? 'currentColor' : 'none'} />
            </button>
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>Favourite</span>
          </label>

          {/* Current members */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Members ({currentMembers.length})
            </label>
            <div className="space-y-1">
              {currentMembers.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>No members yet. Add members below.</p>
              )}
              {currentMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-grey-1)] group"
                >
                  <Avatar name={m.name} initials={m.initials || undefined} colour={m.colour} size={28} />
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text)' }}>{m.name}</span>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-grey-2)] transition-opacity"
                    style={{ color: 'var(--color-danger, #ef4444)' }}
                    title="Remove from team"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Available members to add */}
          {availableMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Add Members
              </label>
              <div className="space-y-1">
                {availableMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-grey-1)] group"
                  >
                    <Avatar name={m.name} initials={m.initials || undefined} colour={m.colour} size={28} />
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>{m.name}</span>
                    <button
                      onClick={() => handleAddMember(m.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-grey-2)] transition-opacity"
                      style={{ color: 'var(--color-primary)' }}
                      title="Add to team"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete + Save */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
                Delete team
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this team?</span>
                <button
                  onClick={onDelete}
                  className="px-2.5 py-1 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-sm rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {!confirmDelete && (
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
