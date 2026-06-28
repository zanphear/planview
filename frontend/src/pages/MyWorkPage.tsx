import { useState, useMemo, useCallback } from 'react';
import { CalendarDays, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { Timeline, type Swimlane, type MilestoneData } from '../components/timeline/Timeline';
import { TaskDetail } from '../components/task/TaskDetail';
import { EmptyState } from '../components/shared/EmptyState';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { Task } from '../api/tasks';
import {
  useMyTasks,
  useMyWorkMilestones,
  useMyWorkMembers,
  useSetMyTasks,
} from '../api/queries/myWork';
import { useCreateTask, useUpdateTask } from '../api/queries/tasks';
import { addDays, format, startOfWeek } from '../utils/dates';
import { ZOOM_CONFIGS } from '../utils/dates';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useTaskContextActions } from '../hooks/useTaskContextActions';

export function MyWorkPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const zoom = useUIStore((s) => s.zoomLevel);
  const setZoom = useUIStore((s) => s.setZoomLevel);

  // ── Client / UI state (stays local) ─────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const startDate = useMemo(() => startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), []);

  // Date window is derived from the selected start date + zoom; it keys the task query.
  const window = useMemo(() => {
    const config = ZOOM_CONFIGS[zoom];
    return {
      since: format(startDate, 'yyyy-MM-dd'),
      until: format(addDays(startDate, config.daysVisible), 'yyyy-MM-dd'),
    };
  }, [startDate, zoom]);

  // ── Server state (TanStack Query, ADR 0003) ────────────────────────────────
  const tasksQuery = useMyTasks(workspace?.id, user?.id, window);
  const milestonesQuery = useMyWorkMilestones(workspace?.id);
  const membersQuery = useMyWorkMembers(workspace?.id);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const milestones: MilestoneData[] = useMemo(
    () => milestonesQuery.data ?? [],
    [milestonesQuery.data],
  );

  // Realtime + context-menu hooks predate Query; route their updates into the cache.
  const setTasks = useSetMyTasks(workspace?.id, user?.id, window);
  const myFilter = useCallback(
    (task: Task) => task.assignees?.some((a) => a.id === user?.id) ?? false,
    [user],
  );
  useRealtimeTasks(setTasks, myFilter);
  const handleContextAction = useTaskContextActions(setTasks, setSelectedTask);

  // ── Mutations (reuse the shared task hooks) ──────────────────────────────────
  const createTask = useCreateTask(workspace?.id, undefined);
  const updateTask = useUpdateTask(workspace?.id, undefined);

  const swimlanes: Swimlane[] = useMemo(() => {
    if (!user) return [];
    return [{ id: user.id, label: user.name, colour: user.colour, tasks }];
  }, [user, tasks]);

  const handleCreateTask = useCallback(
    (_laneId: string, date: string) => {
      if (!workspace) return;
      createTask.mutate(
        {
          name: 'New task',
          date_from: date,
          date_to: date,
          status: 'todo',
          assignee_ids: user ? [user.id] : [],
        },
        {
          onSuccess: (created) => {
            setTasks((prev) => [...prev, created]);
            setSelectedTask(created);
          },
        },
      );
    },
    [workspace, user, createTask, setTasks],
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: { date_from?: string; date_to?: string }) => {
      if (!workspace) return;
      updateTask.mutate(
        { taskId, data: updates },
        {
          onSuccess: (updated) => {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
          },
        },
      );
    },
    [workspace, updateTask, setTasks],
  );

  // ── Four render states: pending / error / empty-with-CTA / success ───────────
  const renderBody = () => {
    if (tasksQuery.isPending) {
      return (
        <div className="flex items-center justify-center h-64">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: 'var(--color-primary)' }}
          />
        </div>
      );
    }

    if (tasksQuery.isError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
          <AlertTriangle size={48} className="mb-4" style={{ color: 'var(--color-danger)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Couldn't load your work
          </h3>
          <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {tasksQuery.error instanceof Error
              ? tasksQuery.error.message
              : 'Something went wrong fetching your timeline.'}
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

    if (tasks.length === 0) {
      return (
        <EmptyState
          icon={<CalendarDays size={48} />}
          title="No tasks assigned to you"
          description="Tasks assigned to you will appear on your personal timeline. Create one to get started."
          action={
            <button
              onClick={() => handleCreateTask(user?.id ?? '', format(new Date(), 'yyyy-MM-dd'))}
              disabled={createTask.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <Plus size={14} />
              New task
            </button>
          }
        />
      );
    }

    return (
      <Timeline
        swimlanes={swimlanes}
        milestones={milestones}
        startDate={startDate}
        zoom={zoom}
        onZoomChange={setZoom}
        onTaskClick={setSelectedTask}
        onTaskUpdate={handleTaskUpdate}
        onCreateTask={handleCreateTask}
        onContextAction={handleContextAction}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 bg-card border-b border-outline shrink-0">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          My Work
        </h2>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">{renderBody()}</div>

      {selectedTask && (
        <TaskDetail task={selectedTask} members={members} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
