import { useState, useEffect, useCallback, useRef } from 'react';
import { Inbox, ChevronDown, ChevronUp, Plus, GripVertical, X, FileText } from 'lucide-react';
import { tasksApi, type Task } from '../../api/tasks';
import { templatesApi, type TaskTemplate } from '../../api/templates';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export function Taskbox() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const taskboxOpen = useUIStore((s) => s.taskboxOpen);
  const setTaskboxOpen = useUIStore((s) => s.setTaskboxOpen);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchUnscheduled = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const { data } = await tasksApi.list(workspace.id, { filter: 'backlog' });
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch taskbox:', err);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    if (taskboxOpen) {
      fetchUnscheduled();
      if (workspace) {
        templatesApi.list(workspace.id).then((res) => setTemplates(res.data)).catch(() => {});
      }
    }
  }, [taskboxOpen, fetchUnscheduled, workspace]);

  const handleCreate = async () => {
    if (!workspace || !newTaskName.trim()) return;
    try {
      const { data } = await tasksApi.create(workspace.id, {
        name: newTaskName.trim(),
        status: 'todo',
        assignee_ids: user ? [user.id] : [],
      });
      setTasks((prev) => [...prev, data]);
      setNewTaskName('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!workspace) return;
    try {
      await tasksApi.delete(workspace.id, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Collapsed state — just a little tab
  if (!taskboxOpen) {
    return (
      <button
        onClick={() => setTaskboxOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all hover:shadow-xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <Inbox size={16} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Taskbox</span>
        {tasks.length > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            {tasks.length}
          </span>
        )}
        <ChevronUp size={14} style={{ color: 'var(--color-text-secondary)' }} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-30 w-80 rounded-xl shadow-xl border flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', maxHeight: '50vh' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b cursor-pointer"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => setTaskboxOpen(false)}
      >
        <div className="flex items-center gap-2">
          <Inbox size={16} style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Taskbox</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            {tasks.length}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading && tasks.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
            No unscheduled tasks. Add one below!
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg group hover:bg-[var(--color-grey-1)] transition-colors"
          >
            <GripVertical size={12} className="opacity-0 group-hover:opacity-60 cursor-grab shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: task.colour || task.project?.colour || 'var(--color-primary)' }}
            />
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text)' }}>
              {task.name}
            </span>
            <button
              onClick={() => handleDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-grey-2)] transition-opacity"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Templates dropdown */}
      {showTemplates && templates.length > 0 && (
        <div className="px-3 py-2 border-t space-y-1 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            Create from template
          </p>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={async () => {
                if (!workspace) return;
                const { data } = await tasksApi.create(workspace.id, {
                  name: tpl.name,
                  description: tpl.description,
                  colour: tpl.colour,
                  status: tpl.status,
                  time_estimate_minutes: tpl.time_estimate_minutes,
                  assignee_ids: user ? [user.id] : [],
                });
                setTasks((prev) => [...prev, data]);
                setShowTemplates(false);
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-1)] transition-colors truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {tpl.colour && <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: tpl.colour }} />}
              {tpl.name}
            </button>
          ))}
        </div>
      )}

      {/* Quick add */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Add a task..."
            className="flex-1 text-sm px-2 py-1.5 border rounded-lg outline-none focus:ring-1"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
          {templates.length > 0 && (
            <button
              onClick={() => setShowTemplates((s) => !s)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-grey-1)]"
              style={{ color: showTemplates ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              title="Create from template"
            >
              <FileText size={14} />
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={!newTaskName.trim()}
            className="p-1.5 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
