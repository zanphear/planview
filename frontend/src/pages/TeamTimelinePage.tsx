import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Timeline, type Swimlane, type MilestoneData } from '../components/timeline/Timeline';
import { TaskDetail } from '../components/task/TaskDetail';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUIStore } from '../stores/uiStore';
import { useTeamStore } from '../stores/teamStore';
import { timelineApi } from '../api/timeline';
import { milestonesApi } from '../api/milestones';
import { tasksApi } from '../api/tasks';
import { membersApi, type User } from '../api/users';
import type { Task } from '../api/tasks';
import { addDays, format, startOfWeek, ZOOM_CONFIGS } from '../utils/dates';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useTaskContextActions } from '../hooks/useTaskContextActions';

export function TeamTimelinePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const teams = useTeamStore((s) => s.teams);
  const zoom = useUIStore((s) => s.zoomLevel);
  const setZoom = useUIStore((s) => s.setZoomLevel);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const team = teams.find((t) => t.id === teamId);
  const startDate = useMemo(() => startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), []);

  // Real-time task updates — only include tasks assigned to a team member
  const memberIds = useMemo(() => new Set(team?.members.map((m) => m.id) || []), [team]);
  const teamFilter = useCallback(
    (task: Task) => task.assignees?.some((a) => memberIds.has(a.id)) ?? false,
    [memberIds],
  );
  useRealtimeTasks(setTasks, teamFilter);

  useEffect(() => {
    if (!workspace || !teamId) return;

    const config = ZOOM_CONFIGS[zoom];
    const since = format(startDate, 'yyyy-MM-dd');
    const until = format(addDays(startDate, config.daysVisible), 'yyyy-MM-dd');

    // Get team members
    const teamData = teams.find((t) => t.id === teamId);
    const userIds = teamData?.members.map((m) => m.id).join(',') || '';

    Promise.all([
      timelineApi.get(workspace.id, { since, until, users: userIds || undefined }),
      milestonesApi.list(workspace.id),
      membersApi.list(workspace.id),
    ]).then(([tasksRes, milestonesRes, membersRes]) => {
      setTasks(tasksRes.data);
      setMilestones(milestonesRes.data);
      setMembers(membersRes.data);
    });
  }, [workspace, teamId, teams, zoom, startDate]);

  const swimlanes: Swimlane[] = useMemo(() => {
    const teamMembers = team?.members || [];
    return teamMembers.map((member) => ({
      id: member.id,
      label: member.name,
      colour: member.colour,
      tasks: tasks.filter((t) => t.assignees.some((a) => a.id === member.id)),
    }));
  }, [team, tasks]);

  const handleCreateTask = useCallback(async (laneId: string, date: string) => {
    if (!workspace) return;
    try {
      const { data } = await tasksApi.create(workspace.id, {
        name: 'New task',
        date_from: date,
        date_to: date,
        status: 'todo',
        assignee_ids: [laneId],
      });
      setTasks((prev) => [...prev, data]);
      setSelectedTask(data);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }, [workspace]);

  const handleContextAction = useTaskContextActions(setTasks, setSelectedTask);

  const handleTaskUpdate = useCallback(async (taskId: string, updates: { date_from?: string; date_to?: string; laneId?: string }) => {
    if (!workspace) return;
    const apiData: Record<string, unknown> = {};
    if (updates.date_from) apiData.date_from = updates.date_from;
    if (updates.date_to) apiData.date_to = updates.date_to;
    if (updates.laneId) apiData.assignee_ids = [updates.laneId];

    try {
      const { data } = await tasksApi.update(workspace.id, taskId, apiData);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [workspace]);

  return (
    <div className="h-full flex flex-col -m-6">
      {team && (
        <div className="px-6 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{team.name}</h2>
        </div>
      )}

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
