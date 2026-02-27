import { useState, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { tagsApi, type Tag } from '../../api/tags';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DEFAULT_COLOURS } from '../../utils/constants';

interface TagPickerProps {
  projectId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagPicker({ projectId, selectedIds, onChange }: TagPickerProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [tags, setTags] = useState<Tag[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchTags = useCallback(async () => {
    if (!workspace || !projectId) return;
    const { data } = await tagsApi.list(workspace.id, projectId);
    setTags(data);
  }, [workspace, projectId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    if (!workspace || !projectId || !newName.trim()) return;
    const colour = DEFAULT_COLOURS[tags.length % DEFAULT_COLOURS.length];
    const { data } = await tagsApi.create(workspace.id, projectId, { name: newName.trim(), colour });
    setTags((prev) => [...prev, data]);
    onChange([...selectedIds, data.id]);
    setNewName('');
    setCreating(false);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        Tags
      </label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: selected ? tag.colour : 'var(--color-grey-2)',
                color: selected ? '#fff' : 'var(--color-text-secondary)',
                opacity: selected ? 1 : 0.7,
              }}
            >
              {tag.name}
              {selected && <X size={10} className="inline ml-1 -mr-0.5" />}
            </button>
          );
        })}

        {creating ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              onBlur={() => { setCreating(false); setNewName(''); }}
              placeholder="Tag name..."
              className="px-2 py-0.5 text-xs border rounded-full outline-none w-24"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-2 py-0.5 rounded-full text-xs flex items-center gap-0.5 hover:opacity-80"
            style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)' }}
          >
            <Plus size={10} />
            Add
          </button>
        )}
      </div>
    </div>
  );
}
