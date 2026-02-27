import { useRef, useEffect, useMemo, useCallback } from 'react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineSwimlane } from './TimelineSwimlane';
import { TodayMarker } from './TodayMarker';
import { MilestoneMarker } from './MilestoneMarker';
import { ZoomControls } from './ZoomControls';
import { generateDateRange, getDateOffset, ZOOM_CONFIGS } from '../../utils/dates';
import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import type { ZoomLevel } from '../../utils/dates';
import type { Task } from '../../api/tasks';

export interface Swimlane {
  id: string;
  label: string;
  colour?: string;
  tasks: Task[];
}

export interface MilestoneData {
  id: string;
  name: string;
  date: string;
  colour: string;
}

interface TimelineProps {
  swimlanes: Swimlane[];
  milestones?: MilestoneData[];
  startDate: Date;
  zoom: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  onTaskClick: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: { date_from?: string; date_to?: string; laneId?: string }) => void;
  onCreateTask?: (laneId: string, date: string) => void;
  onContextAction?: (action: string, task: Task) => void;
}

export function Timeline({ swimlanes, milestones = [], startDate, zoom, onZoomChange, onTaskClick, onTaskUpdate, onCreateTask, onContextAction }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const config = ZOOM_CONFIGS[zoom];
  const dates = useMemo(() => generateDateRange(startDate, config.daysVisible), [startDate, config.daysVisible]);

  const handleDragComplete = useCallback((taskId: string, updates: { date_from?: string; date_to?: string; laneId?: string }) => {
    onTaskUpdate?.(taskId, updates);
  }, [onTaskUpdate]);

  const { dragState, startDrag } = useTimelineDrag(
    config.columnWidth,
    scrollRef,
    ghostRef,
    handleDragComplete,
  );

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = getDateOffset(new Date(), startDate);
      if (todayOffset >= 0 && todayOffset < dates.length) {
        const scrollPosition = todayOffset * config.columnWidth - scrollRef.current.clientWidth / 3;
        scrollRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [startDate, config.columnWidth, dates.length]);

  const totalWidth = dates.length * config.columnWidth + 192; // 192 = label column
  const todayOffset = getDateOffset(new Date(), startDate);
  const todayLeft = todayOffset >= 0 ? 192 + todayOffset * config.columnWidth + config.columnWidth / 2 : -1;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <ZoomControls value={zoom} onChange={onZoomChange} />
        <button
          onClick={() => {
            if (scrollRef.current) {
              const todayPos = todayOffset * config.columnWidth - scrollRef.current.clientWidth / 3;
              scrollRef.current.scrollTo({ left: Math.max(0, todayPos), behavior: 'smooth' });
            }
          }}
          className="px-3 py-1 text-xs font-medium rounded-lg"
          style={{ color: 'var(--color-primary)' }}
        >
          Today
        </button>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div style={{ minWidth: totalWidth }}>
          <TimelineHeader dates={dates} zoom={zoom} />

          <div className="relative">
            {/* Today marker */}
            {todayLeft > 0 && <TodayMarker left={todayLeft} height={swimlanes.length * 60 + 100} />}

            {/* Milestone markers */}
            {milestones.map((m) => {
              const offset = getDateOffset(new Date(m.date), startDate);
              const left = offset >= 0 ? 192 + offset * config.columnWidth + config.columnWidth / 2 : -1;
              return (
                <MilestoneMarker
                  key={m.id}
                  left={left}
                  height={swimlanes.length * 60 + 100}
                  name={m.name}
                  colour={m.colour}
                />
              );
            })}

            {/* Swimlanes */}
            {swimlanes.map((lane) => (
              <TimelineSwimlane
                key={lane.id}
                laneId={lane.id}
                label={lane.label}
                labelColour={lane.colour}
                tasks={lane.tasks}
                dates={dates}
                zoom={zoom}
                dragState={dragState}
                onTaskClick={onTaskClick}
                onDragStart={onTaskUpdate ? startDrag : undefined}
                onCreateTask={onCreateTask}
                onContextAction={onContextAction}
              />
            ))}

            {swimlanes.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No tasks to display
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag ghost overlay */}
      <div ref={ghostRef} style={{ display: 'none' }} />
    </div>
  );
}
