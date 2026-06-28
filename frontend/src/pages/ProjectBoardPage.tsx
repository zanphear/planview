import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Inbox, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { Board } from '../components/board/Board';
import { TaskDetail } from '../components/task/TaskDetail';
import { BulkActionBar } from '../components/board/BulkActionBar';
import { FilterBar, type FilterState } from '../components/shared/FilterBar';
import { EmptyState } from '../components/shared/EmptyState';
import { Skeleton } from '../components/shared/Skeleton';
import { Toast } from '../components/shared/Toast';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useWSEvent } from '../hooks/WebSocketContext';
import { tasksApi, type Task } from '../api/tasks';
import { membersApi } from '../api/users';
import { useProject } from '../api/queries/projects';
import { useProjectTasks, useCreateTask, useBulkUpdateTasks, taskKeys } from '../api/queries/tasks';

// Pending placeholder shaped like the board (one skeleton column per status).
function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4 h-full">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="flex flex-col gap-3 w-72 shrink-0">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((__, card) => (
            <div
              key={card}
              className="rounded-xl border p-3 space-y-2"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  // ── Server state: TanStack Query (ADR 0003 pilot) ──────────────────────────
  const { data: project } = useProject(workspace?.id, projectId);
  const tasksQuery = useProjectTasks(workspace?.id, projectId);
  const queryTasks = tasksQuery.data;

  // Members are secondary server data for filters/assign; an inline query
  // replaces the old useState+useEffect+.catch (which silently swallowed errors).
  const { data: members = [] } = useQuery({
    queryKey: ['members', workspace?.id],
    queryFn: async () => (await membersApi.list(workspace!.id)).data,
    enabled: !!workspace,
  });

  // Bridge: the @dnd-kit <Board> (and the WS handlers) still read/write the
  // Zustand taskStore for their optimistic updates. Mirror the Query cache into
  // the store one-way so the untouched board keeps working; the store is now a
  // derived view of the Query cache, not an independent source of truth.
  const tasks = useTaskStore((s) => s.tasks);
  const setTasksInStore = useTaskStore((s) => s.setTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);
  const removeTaskFromStore = useTaskStore((s) => s.removeTask);

  useEffect(() => {
    if (queryTasks) setTasksInStore(queryTasks);
  }, [queryTasks, setTasksInStore]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createTask = useCreateTask(workspace?.id, projectId);
  const bulkUpdate = useBulkUpdateTasks(workspace?.id, projectId);

  // ── Client/UI state stays local ────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [filters, setFilters] = useState<FilterState>({ status: null, assignee: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time: task created in this project
  useWSEvent(
    'task.created',
    (data) => {
      if (data.actor_id === userId) return;
      const task = data.task as Task;
      if (task.project_id === projectId) addTask(task);
    },
    [userId, projectId, addTask],
  );

  // Real-time: task updated
  useWSEvent(
    'task.updated',
    (data) => {
      const task = data.task as Task;
      if (task.project_id === projectId) {
        updateTaskInStore(task);
      } else {
        // Task was moved out of this project
        removeTaskFromStore(task.id);
      }
    },
    [projectId, updateTaskInStore, removeTaskFromStore],
  );

  // Real-time: task deleted
  useWSEvent(
    'task.deleted',
    (data) => {
      removeTaskFromStore(data.task_id as string);
    },
    [removeTaskFromStore],
  );

  const handleCreateTask = useCallback(() => {
    if (!workspace || !projectId || !newTaskName.trim()) return;
    createTask.mutate({ name: newTaskName.trim(), project_id: projectId, status: 'todo' });
    setNewTaskName('');
  }, [workspace, projectId, newTaskName, createTask]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.assignee)
      result = result.filter((t) => t.assignees.some((a) => a.id === filters.assignee));
    return result;
  }, [tasks, filters]);

  const handleTaskClick = useCallback(
    (task: Task) => {
      const latest = tasks.find((t) => t.id === task.id) || task;
      setSelectedTask(latest);
    },
    [tasks],
  );

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const handleBulkStatus = useCallback(
    async (status: string) => {
      if (!workspace) return;
      try {
        await bulkUpdate.mutateAsync({ task_ids: Array.from(selectedIds), status });
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Bulk status failed:', err);
      }
    },
    [workspace, selectedIds, bulkUpdate],
  );

  const handleBulkAssign = useCallback(
    async (assigneeId: string) => {
      if (!workspace) return;
      try {
        await bulkUpdate.mutateAsync({
          task_ids: Array.from(selectedIds),
          assignee_ids: [assigneeId],
        });
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Bulk assign failed:', err);
      }
    },
    [workspace, selectedIds, bulkUpdate],
  );

  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleBulkDelete = useCallback(async () => {
    if (!workspace || !projectId) return;
    const ids = Array.from(selectedIds);
    const key = taskKeys.byProject(workspace.id, projectId);
    const previous = qc.getQueryData<Task[]>(key);

    // Optimistic removal from the Query cache (mirrored to the board via the sync effect)
    qc.setQueryData<Task[]>(key, (old) => (old ? old.filter((t) => !ids.includes(t.id)) : old));
    setSelectedIds(new Set());

    // Delayed actual delete with undo
    Toast.show(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted`, {
      label: 'Undo',
      onClick: () => {
        if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current);
        if (previous) qc.setQueryData(key, previous);
      },
    });

    pendingDeleteRef.current = setTimeout(async () => {
      try {
        await Promise.all(ids.map((id) => tasksApi.delete(workspace.id, id)));
        qc.invalidateQueries({ queryKey: key });
      } catch (err) {
        console.error('Bulk delete failed:', err);
        if (previous) qc.setQueryData(key, previous);
      }
    }, 5000);
  }, [workspace, projectId, selectedIds, qc]);

  const handleExport = useCallback(
    async (fmt: string) => {
      if (!workspace) return;
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `/api/v1/workspaces/${workspace.id}/export/tasks.${fmt}?project_id=${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'tasks'}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.show(`Exported as ${fmt.toUpperCase()}`);
    },
    [workspace, projectId, project],
  );

  // ── Board render: four explicit states ──────────────────────────────────────
  const renderBoard = () => {
    if (tasksQuery.isPending) {
      return <BoardSkeleton />;
    }
    if (tasksQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <AlertTriangle size={48} className="mb-4" style={{ color: 'var(--color-danger)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Couldn't load tasks
          </h3>
          <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {tasksQuery.error instanceof Error
              ? tasksQuery.error.message
              : 'Something went wrong fetching this board.'}
          </p>
          <button
            onClick={() => tasksQuery.refetch()}
            disabled={tasksQuery.isFetching}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <RefreshCw size={14} className={tasksQuery.isFetching ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
      );
    }
    if ((queryTasks?.length ?? 0) === 0) {
      return (
        <EmptyState
          icon={<Inbox size={48} />}
          title="No tasks yet"
          description="Create your first task using the input above, or press N for quick add."
          action={
            <button
              onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Plus size={16} />
              Add a task
            </button>
          }
        />
      );
    }
    return (
      <Board
        tasks={filteredTasks}
        onTaskClick={handleTaskClick}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />
    );
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {project && (
            <>
              <div className="w-4 h-4 rounded" style={{ backgroundColor: project.colour }} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                {project.name}
              </h2>
            </>
          )}
        </div>

        {/* Filters + Export + Quick add */}
        <div className="flex items-center gap-3">
          <FilterBar filters={filters} onChange={setFilters} members={members} />
          <div className="relative group">
            <button
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Export tasks"
            >
              <Download size={16} />
            </button>
            <div
              className="absolute right-0 top-full mt-1 w-28 rounded-lg border shadow-lg py-1 hidden group-hover:block z-10"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              {['csv', 'json', 'ics'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-subtle transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            placeholder="New task..."
            className="px-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 w-60"
            style={
              {
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                '--tw-ring-color': 'var(--color-primary)',
              } as React.CSSProperties
            }
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

      {/* Board (four states: pending / error / empty / success) */}
      <div className="flex-1 overflow-hidden">{renderBoard()}</div>

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
        <TaskDetail task={selectedTask} members={members} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
