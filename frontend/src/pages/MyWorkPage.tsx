import { useEffect, useState, useMemo, useCallback } from 'react';
import { Timeline, type Swimlane, type MilestoneData } from '../components/timeline/Timeline';
import { TaskDetail } from '../components/task/TaskDetail';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { timelineApi } from '../api/timeline';
import { milestonesApi } from '../api/milestones';
import { tasksApi } from '../api/tasks';
import { membersApi, type User } from '../api/users';
import type { Task } from '../api/tasks';
import { addDays, format, startOfWeek } from '../utils/dates';
import { ZOOM_CONFIGS } from '../utils/dates';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useTaskContextActions } from '../hooks/useTaskContextActions';

export function MyWorkPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const zoom = useUIStore((s) => s.zoomLevel);
  const setZoom = useUIStore((s) => s.setZoomLevel);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const startDate = useMemo(() => startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), []);

  // Real-time task updates — only include tasks assigned to current user
  const myFilter = useCallback(
    (task: Task) => task.assignees?.some((a) => a.id === user?.id) ?? false,
    [user],
  );
  useRealtimeTasks(setTasks, myFilter);
  const handleContextAction = useTaskContextActions(setTasks, setSelectedTask);

  useEffect(() => {
    if (!workspace || !user) return;

    const config = ZOOM_CONFIGS[zoom];
    const since = format(startDate, 'yyyy-MM-dd');
    const until = format(addDays(startDate, config.daysVisible), 'yyyy-MM-dd');

    Promise.all([
      timelineApi.get(workspace.id, { since, until, users: user.id }),
      milestonesApi.list(workspace.id),
      membersApi.list(workspace.id),
    ]).then(([tasksRes, milestonesRes, membersRes]) => {
      setTasks(tasksRes.data);
      setMilestones(milestonesRes.data);
      setMembers(membersRes.data);
    });
  }, [workspace, user, zoom, startDate]);

  const swimlanes: Swimlane[] = useMemo(() => {
    if (!user) return [];
    return [
      {
        id: user.id,
        label: user.name,
        colour: user.colour,
        tasks,
      },
    ];
  }, [user, tasks]);

  const handleCreateTask = useCallback(async (_laneId: string, date: string) => {
    if (!workspace) return;
    try {
      const { data } = await tasksApi.create(workspace.id, {
        name: 'New task',
        date_from: date,
        date_to: date,
        status: 'todo',
        assignee_ids: user ? [user.id] : [],
      });
      setTasks((prev) => [...prev, data]);
      setSelectedTask(data);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }, [workspace, user]);

  const handleTaskUpdate = useCallback(async (taskId: string, updates: { date_from?: string; date_to?: string }) => {
    if (!workspace) return;
    try {
      const { data } = await tasksApi.update(workspace.id, taskId, updates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [workspace]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>My Work</h2>
      </div>

      <div className="flex-1 overflow-hidden">
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
      </div>

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
