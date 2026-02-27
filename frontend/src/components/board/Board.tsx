import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { BoardColumn } from './BoardColumn';
import { BoardCard } from './BoardCard';
import { DEFAULT_STATUSES } from '../../utils/constants';
import { tasksApi, type Task } from '../../api/tasks';
import { useTaskStore } from '../../stores/taskStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface BoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

export function Board({ tasks, onTaskClick, selectedIds, onToggleSelect }: BoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByStatus = DEFAULT_STATUSES.reduce(
    (acc, status) => {
      acc[status.id] = tasks.filter((t) => t.status === status.id);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over || !workspace) return;

      const task = tasks.find((t) => t.id === active.id);
      if (!task) return;

      // Determine target status — over.id is either a status column id or a task id
      let targetStatus = over.id as string;
      if (!DEFAULT_STATUSES.some((s) => s.id === targetStatus)) {
        // Dropped on another task — find its status
        const targetTask = tasks.find((t) => t.id === over.id);
        if (targetTask) targetStatus = targetTask.status;
      }

      if (task.status !== targetStatus) {
        // Optimistic update
        const updated = { ...task, status: targetStatus };
        updateTaskInStore(updated);

        try {
          await tasksApi.update(workspace.id, task.id, { status: targetStatus });
        } catch {
          // Revert on failure
          updateTaskInStore(task);
        }
      }
    },
    [tasks, workspace, updateTaskInStore]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {DEFAULT_STATUSES.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.id] || []}
            onTaskClick={onTaskClick}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <BoardCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
