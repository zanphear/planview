import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ChecklistItem } from '../../api/tasks';

interface TaskChecklistProps {
  items: ChecklistItem[];
  onAdd: (title: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskChecklist({ items, onAdd, onToggle, onDelete }: TaskChecklistProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  const done = items.filter((i) => i.is_completed).length;
  const total = items.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Checklist</span>
        {total > 0 && (
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-grey-2)' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: 'var(--color-success)' }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <GripVertical size={14} className="opacity-0 group-hover:opacity-100 cursor-grab" style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => onToggle(item.id, !item.is_completed)}
              className="rounded"
              style={{ accentColor: 'var(--color-primary)', borderColor: 'var(--color-border)' }}
            />
            <span
              className={`flex-1 text-sm ${item.is_completed ? 'line-through' : ''}`}
              style={{ color: item.is_completed ? 'var(--color-text-secondary)' : 'var(--color-text)' }}
            >
              {item.title}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add item..."
          className="flex-1 px-2 py-1 text-sm border rounded outline-none focus:ring-1"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="p-1 rounded disabled:opacity-30 hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
