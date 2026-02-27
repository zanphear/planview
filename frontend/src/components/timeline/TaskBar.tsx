import { useState } from 'react';
import { Copy, Trash2, Circle, Palette } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { ContextMenu, type ContextMenuItem } from '../shared/ContextMenu';
import type { Task } from '../../api/tasks';
import type { DragMode } from '../../hooks/useTimelineDrag';

interface TaskBarProps {
  task: Task;
  left: number;
  width: number;
  columnWidth: number;
  isDragging?: boolean;
  onClick: () => void;
  onDragStart?: (mode: DragMode, e: React.MouseEvent) => void;
  onContextAction?: (action: string, task: Task) => void;
}

export function TaskBar({ task, left, width, columnWidth, isDragging, onClick, onDragStart, onContextAction }: TaskBarProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const colour = task.colour || task.project?.colour || '#4186E0';
  const isDone = task.status === 'done';
  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.is_completed).length;
  const checklistProgress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;
  const hasDescription = !!task.description;

  const pixelLeft = left * columnWidth;
  const pixelWidth = Math.max(width * columnWidth - 2, columnWidth - 2);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (onDragStart && task.date_from && task.date_to) {
      onDragStart('move', e);
    }
  };

  const handleResizeStart = (mode: 'resize-left' | 'resize-right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDragStart && task.date_from && task.date_to) {
      onDragStart(mode, e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextItems: ContextMenuItem[] = [
    {
      label: 'To-do',
      icon: <Circle size={14} className="text-gray-400" />,
      onClick: () => onContextAction?.('status:todo', task),
    },
    {
      label: 'In Progress',
      icon: <Circle size={14} className="text-blue-500" />,
      onClick: () => onContextAction?.('status:in_progress', task),
    },
    {
      label: 'Done',
      icon: <Circle size={14} className="text-green-500" />,
      onClick: () => onContextAction?.('status:done', task),
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Change colour',
      icon: <Palette size={14} />,
      onClick: () => onContextAction?.('colour', task),
    },
    {
      label: 'Duplicate',
      icon: <Copy size={14} />,
      onClick: () => onContextAction?.('duplicate', task),
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onContextAction?.('delete', task),
    },
  ];

  return (
    <>
      <div
        data-task-bar
        className={`absolute h-[32px] rounded cursor-pointer group transition-shadow hover:shadow-md ${isDone ? 'opacity-50' : ''} ${isDragging ? 'opacity-30' : ''}`}
        style={{
          left: pixelLeft,
          width: pixelWidth,
          backgroundColor: colour,
          top: 4,
        }}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        {/* Task content */}
        <div className="flex items-center h-full px-2 overflow-hidden">
          <span className="text-white text-xs font-medium truncate flex-1">
            {task.status_emoji && <span className="mr-1">{task.status_emoji}</span>}
            {task.name}
          </span>

          {/* Assignee avatar */}
          {task.assignees.length > 0 && (
            <div className="ml-1 shrink-0">
              <Avatar
                name={task.assignees[0].name}
                initials={task.assignees[0].initials}
                colour="rgba(255,255,255,0.3)"
                size={20}
              />
            </div>
          )}
        </div>

        {/* Notes indicator */}
        {hasDescription && (
          <div
            className="absolute top-0 right-0 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderTop: `6px solid rgba(255,255,255,0.6)`,
            }}
          />
        )}

        {/* Checklist progress bar */}
        {checklistTotal > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10 rounded-b">
            <div
              className="h-full bg-white/50 rounded-bl"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        )}

        {/* Project name (below task, only if room) */}
        {pixelWidth > 100 && task.project && (
          <div className="absolute -bottom-3 left-0 text-[9px] text-gray-400 truncate" style={{ maxWidth: pixelWidth }}>
            {task.project.name}
          </div>
        )}

        {/* Resize handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => handleResizeStart('resize-left', e)}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => handleResizeStart('resize-right', e)}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
