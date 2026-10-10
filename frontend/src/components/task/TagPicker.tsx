import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useProjectTags, useCreateTag } from '../../api/queries/tags';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DEFAULT_COLOURS } from '../../utils/constants';

interface TagPickerProps {
  projectId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagPicker({ projectId, selectedIds, onChange }: TagPickerProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const tagsQuery = useProjectTags(workspace?.id, projectId);
  const tags = tagsQuery.data ?? [];
  const createTag = useCreateTag(workspace?.id, projectId);

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
    const created = await createTag.mutateAsync({ name: newName.trim(), colour });
    onChange([...selectedIds, created.id]);
    setNewName('');
    setCreating(false);
  };

  return (
    <div>
      <label
        className="block text-xs font-medium mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {tagsQuery.isPending && (
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Loading…
          </span>
        )}
        {tagsQuery.isError && (
          <button
            onClick={() => tagsQuery.refetch()}
            className="text-xs underline"
            style={{ color: 'var(--color-danger)' }}
          >
            Failed to load tags, retry
          </button>
        )}
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => toggle(tag.id)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
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
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewName('');
                }
              }}
              onBlur={() => {
                setCreating(false);
                setNewName('');
              }}
              placeholder="Tag name..."
              className="px-2 py-0.5 text-xs border rounded-full outline-none w-24"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
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
