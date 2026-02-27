import { TaskBar } from './TaskBar';
import { getTaskSpan, format } from '../../utils/dates';
import type { Task } from '../../api/tasks';
import type { ZoomLevel } from '../../utils/dates';
import type { DragMode, DragState } from '../../hooks/useTimelineDrag';
import { ZOOM_CONFIGS } from '../../utils/dates';

interface TimelineSwimlaneProps {
  laneId: string;
  label: string;
  labelColour?: string;
  tasks: Task[];
  dates: Date[];
  zoom: ZoomLevel;
  dragState: DragState | null;
  onTaskClick: (task: Task) => void;
  onDragStart?: (taskId: string, mode: DragMode, e: React.MouseEvent, dateFrom: string, dateTo: string, laneId: string) => void;
  onCreateTask?: (laneId: string, date: string) => void;
  onContextAction?: (action: string, task: Task) => void;
}

export function TimelineSwimlane({ laneId, label, labelColour, tasks, dates, zoom, dragState, onTaskClick, onDragStart, onCreateTask, onContextAction }: TimelineSwimlaneProps) {
  const config = ZOOM_CONFIGS[zoom];
  const rangeStart = dates[0];

  // Highlight when a task is being dragged into this lane from another lane
  const isDropTarget = dragState?.mode === 'move' &&
    dragState.targetLaneId === laneId &&
    dragState.targetLaneId !== dragState.originalLaneId;

  // Stack tasks to avoid overlap
  const rows: Task[][] = [];
  const sortedTasks = [...tasks].sort((a, b) => (a.date_from || '').localeCompare(b.date_from || ''));

  for (const task of sortedTasks) {
    if (!task.date_from || !task.date_to) continue;
    const { left } = getTaskSpan(task.date_from, task.date_to, rangeStart);

    let placed = false;
    for (const row of rows) {
      const lastTask = row[row.length - 1];
      if (lastTask.date_from && lastTask.date_to) {
        const lastSpan = getTaskSpan(lastTask.date_from, lastTask.date_to, rangeStart);
        if (left >= lastSpan.left + lastSpan.width) {
          row.push(task);
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      rows.push([task]);
    }
  }

  const rowHeight = 40;
  const swimlaneHeight = Math.max(rows.length * rowHeight + 8, rowHeight + 8);

  return (
    <div
      data-lane-id={laneId}
      className={`flex border-b transition-colors ${isDropTarget ? 'bg-blue-50 border-blue-200' : 'border-gray-100'}`}
      style={{ minHeight: swimlaneHeight }}
    >
      {/* Label column */}
      <div className="w-48 shrink-0 border-r border-gray-200 px-3 py-2 flex items-start gap-2">
        {labelColour && (
          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: labelColour }} />
        )}
        <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
      </div>

      {/* Tasks area */}
      <div
        className="relative flex-1"
        style={{ width: dates.length * config.columnWidth }}
        onDoubleClick={(e) => {
          if (!onCreateTask) return;
          // Only create if clicking on empty space (not on a task bar)
          if ((e.target as HTMLElement).closest('[data-task-bar]')) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const colIndex = Math.floor(x / config.columnWidth);
          if (colIndex >= 0 && colIndex < dates.length) {
            const clickedDate = format(dates[colIndex], 'yyyy-MM-dd');
            onCreateTask(laneId, clickedDate);
          }
        }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 flex">
          {dates.map((date, i) => {
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <div
                key={i}
                className={`border-r border-gray-50 ${weekend ? 'bg-gray-50/50' : ''}`}
                style={{ width: config.columnWidth }}
              />
            );
          })}
        </div>

        {/* Task bars */}
        {rows.map((row, rowIndex) =>
          row.map((task) => {
            if (!task.date_from || !task.date_to) return null;
            const { left, width } = getTaskSpan(task.date_from, task.date_to, rangeStart);
            const beingDragged = dragState?.taskId === task.id;
            return (
              <div key={task.id} style={{ position: 'absolute', top: rowIndex * rowHeight + 4 }}>
                <TaskBar
                  task={task}
                  left={left}
                  width={width}
                  columnWidth={config.columnWidth}
                  isDragging={beingDragged}
                  onClick={() => onTaskClick(task)}
                  onDragStart={onDragStart ? (mode, e) => onDragStart(task.id, mode, e, task.date_from!, task.date_to!, laneId) : undefined}
                  onContextAction={onContextAction}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
