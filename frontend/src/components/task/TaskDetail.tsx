import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Users as UsersIcon, Clock, Play, Square, Timer } from 'lucide-react';
import { tasksApi, type Task } from '../../api/tasks';
import { checklistsApi } from '../../api/checklists';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTaskStore } from '../../stores/taskStore';
import { ColourPicker } from './ColourPicker';
import { StatusPicker } from './StatusPicker';
import { AssigneePicker } from './AssigneePicker';
import { TaskChecklist } from './TaskChecklist';
import { TaskComments } from './TaskComments';
import { TaskAttachments } from './TaskAttachments';
import { RichTextEditor } from './RichTextEditor';
import { TagPicker } from './TagPicker';
import { TaskSubtasks } from './TaskSubtasks';
import { RecurrencePicker } from './RecurrencePicker';
import { DependencyPicker } from './DependencyPicker';
import { CustomFieldsEditor } from './CustomFieldsEditor';
import { useWSEvent } from '../../hooks/WebSocketContext';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../api/users';

interface TaskDetailProps {
  task: Task;
  members: User[];
  onClose: () => void;
}

export function TaskDetail({ task: initialTask, members, onClose }: TaskDetailProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);
  const [task, setTask] = useState(initialTask);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(task.name);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTask(initialTask);
    setNameValue(initialTask.name);
  }, [initialTask]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Real-time: update panel when another user edits this task
  const currentUserId = useAuthStore((s) => s.user?.id);
  useWSEvent('task.updated', (data) => {
    if (data.actor_id === currentUserId) return;
    const updated = data.task as Task;
    if (updated.id === task.id) {
      setTask(updated);
      setNameValue(updated.name);
      updateTaskInStore(updated);
    }
  }, [currentUserId, task.id, updateTaskInStore]);

  const save = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!workspace) return;
      const { data } = await tasksApi.update(workspace.id, task.id, updates);
      setTask(data);
      updateTaskInStore(data);
    },
    [workspace, task.id, updateTaskInStore]
  );

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameValue !== task.name && nameValue.trim()) {
      save({ name: nameValue.trim() });
    }
  };

  const refreshTask = useCallback(async () => {
    if (!workspace) return;
    const { data } = await tasksApi.update(workspace.id, task.id, {});
    setTask(data);
    updateTaskInStore(data);
  }, [workspace, task.id, updateTaskInStore]);

  const handleChecklistAdd = async (title: string) => {
    if (!workspace) return;
    await checklistsApi.create(workspace.id, task.id, { title });
    await refreshTask();
  };

  const handleChecklistToggle = async (id: string, completed: boolean) => {
    if (!workspace) return;
    await checklistsApi.update(workspace.id, task.id, id, { is_completed: completed });
    await refreshTask();
  };

  const handleChecklistDelete = async (id: string) => {
    if (!workspace) return;
    await checklistsApi.delete(workspace.id, task.id, id);
    await refreshTask();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] shadow-2xl z-50 flex flex-col border-l animate-slide-in"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: task.colour || task.project?.colour || '#4186E0' }}
          />
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
              className="flex-1 text-lg font-semibold px-1 border-b-2 outline-none"
              style={{ borderColor: 'var(--color-primary)', backgroundColor: 'transparent', color: 'var(--color-text)' }}
            />
          ) : (
            <h2
              className="text-lg font-semibold truncate cursor-pointer px-1 rounded hover:opacity-80"
              style={{ color: 'var(--color-text)' }}
              onClick={() => setEditingName(true)}
            >
              {task.name}
            </h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
          <StatusPicker value={task.status} onChange={(status) => save({ status })} />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label>
            <input
              type="date"
              value={task.date_from || ''}
              onChange={(e) => save({ date_from: e.target.value || null })}
              className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>End Date</label>
            <input
              type="date"
              value={task.date_to || ''}
              onChange={(e) => save({ date_to: e.target.value || null })}
              className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Time estimate */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={12} className="inline mr-1" />
            Time Estimate
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={15}
              value={task.time_estimate_minutes || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                save({ time_estimate_minutes: val });
              }}
              placeholder="Minutes"
              className="w-24 px-2 py-1.5 text-sm border rounded-lg outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
            {task.time_estimate_minutes && (
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {Math.floor(task.time_estimate_minutes / 60)}h {task.time_estimate_minutes % 60}m
              </span>
            )}
          </div>
        </div>

        {/* Time Tracking */}
        <TimeTracker
          logged={task.time_logged_minutes || 0}
          estimate={task.time_estimate_minutes || 0}
          onLog={(minutes) => save({ time_logged_minutes: (task.time_logged_minutes || 0) + minutes })}
          onReset={() => save({ time_logged_minutes: 0 })}
        />

        {/* Recurrence */}
        <RecurrencePicker
          isRecurring={task.is_recurring}
          rule={task.recurrence_rule}
          onChange={(isRecurring, recurrence_rule) => save({ is_recurring: isRecurring, recurrence_rule })}
        />

        {/* Assignees */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            <UsersIcon size={12} className="inline mr-1" />
            Assignees
          </label>
          <AssigneePicker
            members={members}
            selectedIds={task.assignees.map((a) => a.id)}
            onChange={(ids) => save({ assignee_ids: ids })}
          />
        </div>

        {/* Colour */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Colour</label>
          <ColourPicker
            value={task.colour || task.project?.colour || '#4186E0'}
            onChange={(colour) => save({ colour })}
          />
        </div>

        {/* Tags */}
        {task.project_id && (
          <TagPicker
            projectId={task.project_id}
            selectedIds={task.tags.map((t) => t.id)}
            onChange={(ids) => save({ tag_ids: ids })}
          />
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
          <RichTextEditor
            content={task.description || ''}
            onChange={(html) => {
              // Only save if content actually changed (avoid loops)
              if (html !== task.description) save({ description: html });
            }}
          />
        </div>

        {/* Dependencies */}
        <DependencyPicker taskId={task.id} />

        {/* Custom Fields */}
        <CustomFieldsEditor taskId={task.id} />

        {/* Subtasks */}
        <TaskSubtasks
          taskId={task.id}
          subtasks={task.subtasks || []}
          onRefresh={refreshTask}
        />

        {/* Checklist */}
        <TaskChecklist
          items={task.checklists}
          onAdd={handleChecklistAdd}
          onToggle={handleChecklistToggle}
          onDelete={handleChecklistDelete}
        />

        {/* Attachments */}
        <TaskAttachments taskId={task.id} />

        {/* Comments */}
        <TaskComments taskId={task.id} />

        {/* Project info */}
        {task.project && (
          <div className="text-xs pt-2 border-t" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: task.project.colour }} />
            {task.project.name}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function TimeTracker({
  logged,
  estimate,
  onLog,
  onReset,
}: {
  logged: number;
  estimate: number;
  onLog: (minutes: number) => void;
  onReset: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const mins = Math.max(1, Math.round(elapsed / 60));
    onLog(mins);
    setElapsed(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fmtDuration = (mins: number) => {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pct = estimate > 0 ? Math.min(100, Math.round((logged / estimate) * 100)) : 0;

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        <Timer size={12} className="inline mr-1" />
        Time Tracked
      </label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {!running ? (
            <button
              onClick={start}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
            >
              <Play size={12} />
              Start Timer
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500 text-white"
            >
              <Square size={12} />
              {fmtElapsed(elapsed)}
            </button>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {fmtDuration(logged)}
          </span>
          {estimate > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              / {fmtDuration(estimate)} ({pct}%)
            </span>
          )}
          {logged > 0 && (
            <button
              onClick={onReset}
              className="text-xs ml-auto underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Reset
            </button>
          )}
        </div>
        {estimate > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-grey-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: pct > 100 ? 'var(--color-danger, #ef4444)' : 'var(--color-primary)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
