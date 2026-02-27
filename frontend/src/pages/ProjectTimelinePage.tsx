import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Timeline, type Swimlane, type MilestoneData } from '../components/timeline/Timeline';
import { TaskDetail } from '../components/task/TaskDetail';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUIStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { timelineApi } from '../api/timeline';
import { milestonesApi } from '../api/milestones';
import { tasksApi } from '../api/tasks';
import { membersApi, type User } from '../api/users';
import { api } from '../api/client';
import type { Task } from '../api/tasks';
import { addDays, format, startOfWeek } from '../utils/dates';
import { ZOOM_CONFIGS } from '../utils/dates';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useTaskContextActions } from '../hooks/useTaskContextActions';
import { ShareTimelineModal } from '../components/modals/ShareTimelineModal';
import { Share2 } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  sort_order: number;
  project_id: string;
}

export function ProjectTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const projects = useProjectStore((s) => s.projects);
  const zoom = useUIStore((s) => s.zoomLevel);
  const setZoom = useUIStore((s) => s.setZoomLevel);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showShare, setShowShare] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const startDate = useMemo(() => startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), []);

  // Real-time task updates — only include tasks for this project
  const projectFilter = useCallback(
    (task: Task) => task.project_id === projectId,
    [projectId],
  );
  useRealtimeTasks(setTasks, projectFilter);
  const handleContextAction = useTaskContextActions(setTasks, setSelectedTask);

  useEffect(() => {
    if (!workspace || !projectId) return;

    const config = ZOOM_CONFIGS[zoom];
    const since = format(startDate, 'yyyy-MM-dd');
    const until = format(addDays(startDate, config.daysVisible), 'yyyy-MM-dd');

    Promise.all([
      timelineApi.get(workspace.id, { since, until, project: projectId }),
      api.get<Segment[]>(`/workspaces/${workspace.id}/projects/${projectId}/segments`),
      milestonesApi.list(workspace.id),
      membersApi.list(workspace.id),
    ]).then(([tasksRes, segmentsRes, milestonesRes, membersRes]) => {
      setTasks(tasksRes.data);
      setSegments(segmentsRes.data);
      setMilestones(milestonesRes.data.filter((m) => !m.project_id || m.project_id === projectId));
      setMembers(membersRes.data);
    });
  }, [workspace, projectId, zoom, startDate]);

  const swimlanes: Swimlane[] = useMemo(() => {
    // Group tasks by segment
    const unsegmented = tasks.filter((t) => !t.segment_id);
    const lanes: Swimlane[] = segments.map((seg) => ({
      id: seg.id,
      label: seg.name,
      colour: project?.colour,
      tasks: tasks.filter((t) => t.segment_id === seg.id),
    }));

    if (unsegmented.length > 0) {
      lanes.unshift({
        id: 'unsegmented',
        label: 'Unsegmented',
        colour: project?.colour,
        tasks: unsegmented,
      });
    }

    return lanes;
  }, [tasks, segments, project]);

  const handleCreateTask = useCallback(async (laneId: string, date: string) => {
    if (!workspace || !projectId) return;
    try {
      const { data } = await tasksApi.create(workspace.id, {
        name: 'New task',
        date_from: date,
        date_to: date,
        status: 'todo',
        project_id: projectId,
        segment_id: laneId === 'unsegmented' ? undefined : laneId,
      });
      setTasks((prev) => [...prev, data]);
      setSelectedTask(data);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }, [workspace, projectId]);

  const handleTaskUpdate = useCallback(async (taskId: string, updates: { date_from?: string; date_to?: string; laneId?: string }) => {
    if (!workspace) return;
    const apiData: Record<string, unknown> = {};
    if (updates.date_from) apiData.date_from = updates.date_from;
    if (updates.date_to) apiData.date_to = updates.date_to;
    if (updates.laneId) {
      apiData.segment_id = updates.laneId === 'unsegmented' ? null : updates.laneId;
    }

    try {
      const { data } = await tasksApi.update(workspace.id, taskId, apiData);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [workspace]);

  return (
    <div className="h-full flex flex-col">
      {project && (
        <div className="px-6 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: project.colour }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{project.name}</h2>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Timeline</span>
          <button
            onClick={() => setShowShare(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-2)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Share2 size={14} />
            Share
          </button>
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

      {showShare && project && (
        <ShareTimelineModal
          projectId={project.id}
          entityName={project.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
