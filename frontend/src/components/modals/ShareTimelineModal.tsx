import { useState, useEffect } from 'react';
import { X, Copy, Check, Trash2, Link, Globe } from 'lucide-react';
import { api } from '../../api/client';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Toast } from '../shared/Toast';

interface SharedTimeline {
  id: string;
  token: string;
  name: string;
  is_active: boolean;
  team_id: string | null;
  project_id: string | null;
  created_at: string;
}

interface ShareTimelineModalProps {
  teamId?: string;
  projectId?: string;
  entityName: string;
  onClose: () => void;
}

export function ShareTimelineModal({ teamId, projectId, entityName, onClose }: ShareTimelineModalProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [links, setLinks] = useState<SharedTimeline[]>([]);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    api.get<SharedTimeline[]>(`/workspaces/${workspace.id}/shared-timelines`).then((res) => {
      const filtered = res.data.filter((l) => {
        if (teamId) return l.team_id === teamId;
        if (projectId) return l.project_id === projectId;
        return false;
      });
      setLinks(filtered);
    });
  }, [workspace, teamId, projectId]);

  const handleCreate = async () => {
    if (!workspace) return;
    setCreating(true);
    try {
      const { data } = await api.post<SharedTimeline>(`/workspaces/${workspace.id}/shared-timelines`, {
        name: `${entityName} - Shared`,
        team_id: teamId || null,
        project_id: projectId || null,
      });
      setLinks((prev) => [data, ...prev]);
      Toast.show('Share link created');
    } catch {
      Toast.show('Failed to create share link');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!workspace) return;
    try {
      await api.delete(`/workspaces/${workspace.id}/shared-timelines/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      Toast.show('Share link deleted');
    } catch {
      Toast.show('Failed to delete share link');
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    Toast.show('Link copied to clipboard');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] rounded-xl shadow-2xl z-50 border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Globe size={18} />
            Share Timeline
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Create a public link to share <strong>{entityName}</strong> with anyone — no login required.
          </p>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Link size={14} />
            {creating ? 'Creating...' : 'Create Share Link'}
          </button>

          {links.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Active Links
              </label>
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-grey-1)' }}
                >
                  <Globe size={14} style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-sm flex-1 truncate font-mono" style={{ color: 'var(--color-text)' }}>
                    /shared/{link.token.slice(0, 12)}...
                  </span>
                  <button
                    onClick={() => copyLink(link.token, link.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-grey-2)]"
                    style={{ color: 'var(--color-primary)' }}
                    title="Copy link"
                  >
                    {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-grey-2)]"
                    style={{ color: 'var(--color-danger, #ef4444)' }}
                    title="Delete link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
