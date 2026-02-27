import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard } from './BoardCard';
import type { Task } from '../../api/tasks';

interface BoardColumnProps {
  status: { id: string; label: string; emoji: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function BoardColumn({ status, tasks, onTaskClick }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-xl transition-colors ${
        isOver ? 'bg-blue-50' : 'bg-gray-100'
      }`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span>{status.emoji}</span>
        <span className="font-medium text-sm text-gray-700">{status.label}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-[60px]">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
