import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Users as UsersIcon } from 'lucide-react';
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
    <div ref={panelRef} className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
              className="flex-1 text-lg font-semibold px-1 border-b-2 border-blue-500 outline-none"
            />
          ) : (
            <h2
              className="text-lg font-semibold truncate cursor-pointer hover:bg-gray-50 px-1 rounded"
              onClick={() => setEditingName(true)}
            >
              {task.name}
            </h2>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <StatusPicker value={task.status} onChange={(status) => save({ status })} />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={task.date_from || ''}
              onChange={(e) => save({ date_from: e.target.value || null })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={task.date_to || ''}
              onChange={(e) => save({ date_to: e.target.value || null })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Assignees */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Colour</label>
          <ColourPicker
            value={task.colour || task.project?.colour || '#4186E0'}
            onChange={(colour) => save({ colour })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <RichTextEditor
            content={task.description || ''}
            onChange={(html) => {
              // Only save if content actually changed (avoid loops)
              if (html !== task.description) save({ description: html });
            }}
          />
        </div>

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
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: task.project.colour }} />
            {task.project.name}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
