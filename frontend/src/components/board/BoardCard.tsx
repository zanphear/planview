import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, CheckSquare } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import type { Task } from '../../api/tasks';

interface BoardCardProps {
  task: Task;
  onClick: () => void;
}

export function BoardCard({ task, onClick }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colour = task.colour || task.project?.colour || '#4186E0';
  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.is_completed).length;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow group"
      style={{ ...style, backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Colour bar */}
      <div className="h-1 rounded-full mb-2" style={{ backgroundColor: colour }} />

      {/* Task name */}
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
        {task.status_emoji && <span className="mr-1">{task.status_emoji}</span>}
        {task.name}
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="flex items-center gap-2">
          {task.date_from && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {task.date_from}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare size={12} />
              {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>

        {/* Assignee avatars */}
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} name={a.name} initials={a.initials} colour={a.colour} size={22} />
          ))}
          {task.assignees.length > 3 && (
            <span
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-medium"
              style={{ backgroundColor: 'var(--color-grey-2)', color: 'var(--color-text-secondary)' }}
            >
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 rounded text-[10px] text-white font-medium"
              style={{ backgroundColor: tag.colour }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
