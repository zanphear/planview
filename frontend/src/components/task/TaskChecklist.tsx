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
        <span className="text-sm font-medium text-gray-700">Checklist</span>
        {total > 0 && (
          <span className="text-xs text-gray-500">
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => onToggle(item.id, !item.is_completed)}
              className="rounded border-gray-300"
            />
            <span
              className={`flex-1 text-sm ${
                item.is_completed ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
            >
              {item.title}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
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
          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
