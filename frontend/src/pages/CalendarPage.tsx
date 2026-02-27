import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../api/tasks';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function CalendarPage() {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const isLoading = useTaskStore((s) => s.isLoading);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!workspace) return;
    fetchTasks(workspace.id);
  }, [workspace, fetchTasks]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.date_from) continue;
      const dateFrom = new Date(task.date_from);
      const dateTo = task.date_to ? new Date(task.date_to) : dateFrom;
      const rangeDays = eachDayOfInterval({ start: dateFrom, end: dateTo });
      for (const d of rangeDays) {
        const key = format(d, 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        existing.push(task);
        map.set(key, existing);
      }
    }
    return map;
  }, [tasks]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium py-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 border-t border-l" style={{ borderColor: 'var(--color-border)' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={key}
              className="border-r border-b min-h-[100px] p-1"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: today ? 'var(--color-primary-light, rgba(65,134,224,0.05))' : undefined,
              }}
            >
              <div className="flex justify-end">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    today ? 'bg-[var(--color-primary)] text-white font-bold' : ''
                  }`}
                  style={{ color: today ? undefined : inMonth ? 'var(--color-text)' : 'var(--color-text-secondary)' }}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5 mt-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: task.colour || 'var(--color-primary)',
                      color: 'white',
                    }}
                    title={task.name}
                  >
                    {task.name}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] px-1" style={{ color: 'var(--color-text-secondary)' }}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
