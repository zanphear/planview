import { useCallback, useEffect, useRef, useState } from 'react';
import { addDays, format, parseISO } from '../utils/dates';

export type DragMode = 'move' | 'resize-left' | 'resize-right';

export interface DragState {
  taskId: string;
  mode: DragMode;
  deltaColumns: number;
  targetLaneId: string;
  originalLaneId: string;
}

interface PendingDrag {
  taskId: string;
  mode: DragMode;
  startX: number;
  startY: number;
  barRect: DOMRect;
  dateFrom: string;
  dateTo: string;
  laneId: string;
}

export function useTimelineDrag(
  columnWidth: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  ghostRef: React.RefObject<HTMLDivElement | null>,
  onComplete: (taskId: string, updates: { date_from?: string; date_to?: string; laneId?: string }) => void,
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const activeRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const colWidthRef = useRef(columnWidth);
  colWidthRef.current = columnWidth;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const startDrag = useCallback((
    taskId: string,
    mode: DragMode,
    e: React.MouseEvent,
    dateFrom: string,
    dateTo: string,
    laneId: string,
  ) => {
    const bar = (e.target as HTMLElement).closest('[data-task-bar]') as HTMLElement | null;
    if (!bar) return;

    pendingRef.current = {
      taskId, mode,
      startX: e.clientX, startY: e.clientY,
      barRect: bar.getBoundingClientRect(),
      dateFrom, dateTo, laneId,
    };
    activeRef.current = false;

    let lastDeltaCols = 0;
    let lastTargetLane = laneId;

    const showGhost = (barRect: DOMRect, barEl: HTMLElement) => {
      const ghost = ghostRef.current;
      if (!ghost) return;
      ghost.style.display = 'block';
      ghost.style.position = 'fixed';
      ghost.style.left = `${barRect.left}px`;
      ghost.style.top = `${barRect.top}px`;
      ghost.style.width = `${barRect.width}px`;
      ghost.style.height = `${barRect.height}px`;
      ghost.style.backgroundColor = barEl.style.backgroundColor || '#4186E0';
      ghost.style.borderRadius = '4px';
      ghost.style.opacity = '0.85';
      ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      ghost.style.zIndex = '9999';
      ghost.style.pointerEvents = 'none';
      ghost.style.color = 'white';
      ghost.style.fontSize = '12px';
      ghost.style.fontWeight = '500';
      ghost.style.padding = '0 8px';
      ghost.style.lineHeight = `${barRect.height}px`;
      ghost.style.overflow = 'hidden';
      ghost.style.textOverflow = 'ellipsis';
      ghost.style.whiteSpace = 'nowrap';
      const nameEl = barEl.querySelector('.truncate');
      ghost.textContent = nameEl?.textContent?.trim() || '';
    };

    const onMove = (ev: MouseEvent) => {
      const p = pendingRef.current;
      if (!p) return;

      const dx = ev.clientX - p.startX;
      const dy = ev.clientY - p.startY;

      // Activate after movement threshold
      if (!activeRef.current) {
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          activeRef.current = true;
          document.body.style.userSelect = 'none';
          document.body.style.cursor = p.mode === 'move' ? 'grabbing' : 'ew-resize';
          showGhost(p.barRect, bar);
          setDragState({
            taskId: p.taskId, mode: p.mode, deltaColumns: 0,
            targetLaneId: p.laneId, originalLaneId: p.laneId,
          });
        }
        return;
      }

      // Update ghost position
      const ghost = ghostRef.current;
      if (ghost) {
        if (p.mode === 'move') {
          ghost.style.left = `${p.barRect.left + dx}px`;
          ghost.style.top = `${p.barRect.top + dy}px`;
        } else if (p.mode === 'resize-right') {
          ghost.style.width = `${Math.max(colWidthRef.current, p.barRect.width + dx)}px`;
        } else {
          const w = Math.max(colWidthRef.current, p.barRect.width - dx);
          ghost.style.left = `${p.barRect.right - w}px`;
          ghost.style.width = `${w}px`;
        }
      }

      // Column delta
      const deltaCols = Math.round(dx / colWidthRef.current);

      // Target lane (move only)
      let targetLane = p.laneId;
      if (p.mode === 'move' && containerRef.current) {
        const lanes = containerRef.current.querySelectorAll('[data-lane-id]');
        for (const lane of lanes) {
          const rect = lane.getBoundingClientRect();
          if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            targetLane = lane.getAttribute('data-lane-id') || p.laneId;
            break;
          }
        }
      }

      // Only re-render when values actually change
      if (deltaCols !== lastDeltaCols || targetLane !== lastTargetLane) {
        lastDeltaCols = deltaCols;
        lastTargetLane = targetLane;
        setDragState({
          taskId: p.taskId, mode: p.mode,
          deltaColumns: deltaCols, targetLaneId: targetLane,
          originalLaneId: p.laneId,
        });
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      cleanupRef.current = null;

      // Hide ghost
      const ghost = ghostRef.current;
      if (ghost) ghost.style.display = 'none';

      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      if (activeRef.current && pendingRef.current) {
        // Suppress the click that follows mouseup after a drag
        const suppressClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          document.removeEventListener('click', suppressClick, true);
        };
        document.addEventListener('click', suppressClick, true);
        setTimeout(() => document.removeEventListener('click', suppressClick, true), 200);

        // Calculate final updates
        const { dateFrom, dateTo, laneId: origLane } = pendingRef.current;
        const updates: { date_from?: string; date_to?: string; laneId?: string } = {};

        if (mode === 'move') {
          if (lastDeltaCols !== 0) {
            updates.date_from = format(addDays(parseISO(dateFrom), lastDeltaCols), 'yyyy-MM-dd');
            updates.date_to = format(addDays(parseISO(dateTo), lastDeltaCols), 'yyyy-MM-dd');
          }
          if (lastTargetLane !== origLane) {
            updates.laneId = lastTargetLane;
          }
        } else if (mode === 'resize-left' && lastDeltaCols !== 0) {
          const newFrom = addDays(parseISO(dateFrom), lastDeltaCols);
          if (newFrom <= parseISO(dateTo)) {
            updates.date_from = format(newFrom, 'yyyy-MM-dd');
          }
        } else if (mode === 'resize-right' && lastDeltaCols !== 0) {
          const newTo = addDays(parseISO(dateTo), lastDeltaCols);
          if (newTo >= parseISO(dateFrom)) {
            updates.date_to = format(newTo, 'yyyy-MM-dd');
          }
        }

        if (Object.keys(updates).length > 0) {
          onCompleteRef.current(taskId, updates);
        }
      }

      pendingRef.current = null;
      activeRef.current = false;
      setDragState(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    cleanupRef.current = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [ghostRef, containerRef]);

  return { dragState, startDrag };
}
