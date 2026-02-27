import { useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { tasksApi, type SubtaskBrief } from '../../api/tasks';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface TaskSubtasksProps {
  taskId: string;
  subtasks: SubtaskBrief[];
  onRefresh: () => void;
}

export function TaskSubtasks({ taskId, subtasks, onRefresh }: TaskSubtasksProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = useCallback(async () => {
    if (!workspace || !newName.trim()) return;
    await tasksApi.create(workspace.id, {
      name: newName.trim(),
      status: 'todo',
      parent_id: taskId,
    });
    setNewName('');
    setAdding(false);
    onRefresh();
  }, [workspace, taskId, newName, onRefresh]);

  const handleToggle = useCallback(async (subtask: SubtaskBrief) => {
    if (!workspace) return;
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    await tasksApi.update(workspace.id, subtask.id, { status: newStatus });
    onRefresh();
  }, [workspace, onRefresh]);

  const handleDelete = useCallback(async (subtaskId: string) => {
    if (!workspace) return;
    await tasksApi.delete(workspace.id, subtaskId);
    onRefresh();
  }, [workspace, onRefresh]);

  const doneCount = subtasks.filter((s) => s.status === 'done').length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Subtasks
          {total > 0 && (
            <span className="ml-1.5">({doneCount}/{total})</span>
          )}
        </label>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--color-grey-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: 'var(--color-success)' }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-[var(--color-grey-1)] transition-colors"
          >
            <button
              onClick={() => handleToggle(st)}
              className="shrink-0"
              style={{ color: st.status === 'done' ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
            >
              {st.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </button>
            <span
              className={`flex-1 text-sm ${st.status === 'done' ? 'line-through opacity-60' : ''}`}
              style={{ color: 'var(--color-text)' }}
            >
              {st.name}
            </span>
            <button
              onClick={() => handleDelete(st.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      {adding ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            onBlur={() => { if (!newName.trim()) { setAdding(false); setNewName(''); } }}
            placeholder="Subtask name..."
            className="flex-1 px-2 py-1 text-sm border rounded-lg outline-none focus:ring-1"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs mt-2 hover:opacity-80"
          style={{ color: 'var(--color-primary)' }}
        >
          <Plus size={12} />
          Add subtask
        </button>
      )}
    </div>
  );
}
