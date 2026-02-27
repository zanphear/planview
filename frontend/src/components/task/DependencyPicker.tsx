import { useEffect, useState } from 'react';
import { Link, X, Search } from 'lucide-react';
import { dependenciesApi, type TaskDependency } from '../../api/dependencies';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTaskStore } from '../../stores/taskStore';
import { Toast } from '../shared/Toast';

interface DependencyPickerProps {
  taskId: string;
}

export function DependencyPicker({ taskId }: DependencyPickerProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const allTasks = useTaskStore((s) => s.tasks);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const loadDeps = async () => {
    if (!workspace) return;
    try {
      const { data } = await dependenciesApi.list(workspace.id, taskId);
      setDeps(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadDeps();
  }, [workspace, taskId]);

  const blockers = deps.filter((d) => d.blocked_id === taskId);
  const blocking = deps.filter((d) => d.blocker_id === taskId);

  const handleAdd = async (otherTaskId: string, asBlocker: boolean) => {
    if (!workspace) return;
    try {
      await dependenciesApi.create(workspace.id, {
        blocker_id: asBlocker ? otherTaskId : taskId,
        blocked_id: asBlocker ? taskId : otherTaskId,
      });
      await loadDeps();
      setAdding(false);
      setSearch('');
    } catch {
      Toast.show('Dependency already exists or invalid');
    }
  };

  const handleRemove = async (depId: string) => {
    if (!workspace) return;
    await dependenciesApi.delete(workspace.id, depId);
    setDeps((prev) => prev.filter((d) => d.id !== depId));
  };

  const taskName = (id: string) => allTasks.find((t) => t.id === id)?.name || 'Unknown';

  const filteredTasks = allTasks.filter(
    (t) =>
      t.id !== taskId &&
      !deps.some((d) => d.blocker_id === t.id || d.blocked_id === t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        <Link size={12} className="inline mr-1" />
        Dependencies
      </label>

      {blockers.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            Blocked by
          </span>
          {blockers.map((d) => (
            <div key={d.id} className="flex items-center gap-2 mt-1">
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-danger, #ef4444)' }}>
                {taskName(d.blocker_id)}
              </span>
              <button onClick={() => handleRemove(d.id)} className="p-0.5 hover:opacity-60">
                <X size={12} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {blocking.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            Blocking
          </span>
          {blocking.map((d) => (
            <div key={d.id} className="flex items-center gap-2 mt-1">
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-warning, #f59e0b)' }}>
                {taskName(d.blocked_id)}
              </span>
              <button onClick={() => handleRemove(d.id)} className="p-0.5 hover:opacity-60">
                <X size={12} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="text-xs font-medium hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          + Add dependency
        </button>
      ) : (
        <div className="border rounded-lg p-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Search size={14} style={{ color: 'var(--color-text-secondary)' }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="Search tasks..."
              className="flex-1 text-sm outline-none"
              style={{ backgroundColor: 'transparent', color: 'var(--color-text)' }}
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredTasks.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                  {t.name}
                </span>
                <button
                  onClick={() => handleAdd(t.id, true)}
                  className="text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger, #ef4444)' }}
                >
                  Blocked by
                </button>
                <button
                  onClick={() => handleAdd(t.id, false)}
                  className="text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-warning, #f59e0b)' }}
                >
                  Blocking
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
