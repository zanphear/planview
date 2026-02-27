import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Timeline, type Swimlane, type MilestoneData } from '../components/timeline/Timeline';
import { addDays, startOfWeek, ZOOM_CONFIGS, type ZoomLevel } from '../utils/dates';
import type { Task } from '../api/tasks';
import { api } from '../api/client';

export function SharedTimelinePage() {
  const { token } = useParams<{ token: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('M');

  const startDate = useMemo(() => startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }), []);

  useEffect(() => {
    if (!token) return;

    const config = ZOOM_CONFIGS[zoom];
    const since = startDate.toISOString().slice(0, 10);
    const until = addDays(startDate, config.daysVisible).toISOString().slice(0, 10);

    api.get(`/shared/${token}/tasks`, { params: { since, until } })
      .then((res) => setTasks(res.data))
      .catch(() => setError('This shared timeline is not available.'));
  }, [token, zoom, startDate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Group tasks by assignee for swimlanes
  const swimlanes: Swimlane[] = useMemo(() => {
    const userMap = new Map<string, Swimlane>();
    const unassigned: Task[] = [];

    tasks.forEach((task) => {
      if (task.assignees.length === 0) {
        unassigned.push(task);
        return;
      }
      task.assignees.forEach((a) => {
        if (!userMap.has(a.id)) {
          userMap.set(a.id, { id: a.id, label: a.name, colour: a.colour, tasks: [] });
        }
        userMap.get(a.id)!.tasks.push(task);
      });
    });

    const lanes: Swimlane[] = Array.from(userMap.values());
    if (unassigned.length > 0) {
      lanes.push({ id: 'unassigned', label: 'Unassigned', colour: '#999', tasks: unassigned });
    }
    return lanes;
  }, [tasks]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-800">Planview</h1>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            Shared View
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Timeline
          swimlanes={swimlanes}
          milestones={[] as MilestoneData[]}
          startDate={startDate}
          zoom={zoom}
          onZoomChange={setZoom}
          onTaskClick={() => {}}
        />
      </div>
    </div>
  );
}
