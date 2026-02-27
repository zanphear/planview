import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Board } from '../components/board/Board';
import { TaskDetail } from '../components/task/TaskDetail';
import { BulkActionBar } from '../components/board/BulkActionBar';
import { FilterBar, type FilterState } from '../components/shared/FilterBar';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { useWSEvent } from '../hooks/WebSocketContext';
import { tasksApi, type Task } from '../api/tasks';
import { membersApi, type User } from '../api/users';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [filters, setFilters] = useState<FilterState>({ status: null, assignee: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const userId = useAuthStore((s) => s.user?.id);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);
  const removeTaskFromStore = useTaskStore((s) => s.removeTask);
  const project = projects.find((p) => p.id === projectId);

  // Real-time: task created in this project
  useWSEvent('task.created', (data) => {
    if (data.actor_id === userId) return;
    const task = data.task as Task;
    if (task.project_id === projectId) addTask(task);
  }, [userId, projectId, addTask]);

  // Real-time: task updated
  useWSEvent('task.updated', (data) => {
    const task = data.task as Task;
    if (task.project_id === projectId) {
      updateTaskInStore(task);
    } else {
      // Task was moved out of this project
      removeTaskFromStore(task.id);
    }
  }, [projectId, updateTaskInStore, removeTaskFromStore]);

  // Real-time: task deleted
  useWSEvent('task.deleted', (data) => {
    removeTaskFromStore(data.task_id as string);
  }, [removeTaskFromStore]);

  useEffect(() => {
    if (workspace && projectId) {
      fetchTasks(workspace.id, { project_id: projectId });
      membersApi.list(workspace.id).then((res) => setMembers(res.data));
    }
  }, [workspace, projectId, fetchTasks]);

  const handleCreateTask = useCallback(async () => {
    if (!workspace || !projectId || !newTaskName.trim()) return;
    const { data } = await tasksApi.create(workspace.id, {
      name: newTaskName.trim(),
      project_id: projectId,
      status: 'todo',
    });
    addTask(data);
    setNewTaskName('');
  }, [workspace, projectId, newTaskName, addTask]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.assignee) result = result.filter((t) => t.assignees.some((a) => a.id === filters.assignee));
    return result;
  }, [tasks, filters]);

  const handleTaskClick = useCallback(
    (task: Task) => {
      const latest = tasks.find((t) => t.id === task.id) || task;
      setSelectedTask(latest);
    },
    [tasks]
  );

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const handleBulkStatus = useCallback(async (status: string) => {
    if (!workspace) return;
    const ids = Array.from(selectedIds);
    try {
      const { data } = await tasksApi.bulkUpdate(workspace.id, { task_ids: ids, status });
      data.forEach((t) => updateTaskInStore(t));
      setSelectedIds(new Set());
    } catch (err) { console.error('Bulk status failed:', err); }
  }, [workspace, selectedIds, updateTaskInStore]);

  const handleBulkAssign = useCallback(async (userId: string) => {
    if (!workspace) return;
    const ids = Array.from(selectedIds);
    try {
      const { data } = await tasksApi.bulkUpdate(workspace.id, { task_ids: ids, assignee_ids: [userId] });
      data.forEach((t) => updateTaskInStore(t));
      setSelectedIds(new Set());
    } catch (err) { console.error('Bulk assign failed:', err); }
  }, [workspace, selectedIds, updateTaskInStore]);

  const handleBulkDelete = useCallback(async () => {
    if (!workspace) return;
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => tasksApi.delete(workspace.id, id)));
      ids.forEach((id) => removeTaskFromStore(id));
      setSelectedIds(new Set());
    } catch (err) { console.error('Bulk delete failed:', err); }
  }, [workspace, selectedIds, removeTaskFromStore]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {project && (
            <>
              <div className="w-4 h-4 rounded" style={{ backgroundColor: project.colour }} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>{project.name}</h2>
            </>
          )}
        </div>

        {/* Filters + Quick add */}
        <div className="flex items-center gap-3">
          <FilterBar filters={filters} onChange={setFilters} members={members} />
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            placeholder="New task..."
            className="px-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 w-60"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
          <button
            onClick={handleCreateTask}
            disabled={!newTaskName.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <Board
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          members={members}
          onStatusChange={handleBulkStatus}
          onAssign={handleBulkAssign}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
