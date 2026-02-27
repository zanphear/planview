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
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
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
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);
  const setTasks = useTaskStore((s) => s.setTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Sort tasks by sort_order within each status column
  const tasksByStatus = DEFAULT_STATUSES.reduce(
    (acc, status) => {
      acc[status.id] = tasks
        .filter((t) => t.status === status.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumnId(null); return; }
    // Determine which column we're over
    const isColumn = DEFAULT_STATUSES.some((s) => s.id === over.id);
    if (isColumn) {
      setOverColumnId(over.id as string);
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) setOverColumnId(overTask.status);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      setOverColumnId(null);
      const { active, over } = event;
      if (!over || !workspace) return;

      const task = tasks.find((t) => t.id === active.id);
      if (!task) return;

      // Determine target status
      let targetStatus = over.id as string;
      let targetTaskId: string | null = null;
      if (!DEFAULT_STATUSES.some((s) => s.id === targetStatus)) {
        // Dropped on another task
        const targetTask = tasks.find((t) => t.id === over.id);
        if (targetTask) {
          targetStatus = targetTask.status;
          targetTaskId = targetTask.id;
        }
      }

      const columnTasks = [...(tasksByStatus[targetStatus] || [])];

      if (task.status === targetStatus) {
        // Reorder within same column
        const oldIndex = columnTasks.findIndex((t) => t.id === task.id);
        let newIndex = targetTaskId
          ? columnTasks.findIndex((t) => t.id === targetTaskId)
          : columnTasks.length;

        if (oldIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const reorderItems = reordered.map((t, i) => ({ id: t.id, sort_order: i }));

        // Optimistic update
        const updatedTasks = tasks.map((t) => {
          const item = reorderItems.find((r) => r.id === t.id);
          return item ? { ...t, sort_order: item.sort_order } : t;
        });
        setTasks(updatedTasks);

        try {
          await tasksApi.reorder(workspace.id, reorderItems);
        } catch {
          // Revert on failure
          setTasks(tasks);
        }
      } else {
        // Move to different column
        const newSortOrder = targetTaskId
          ? (columnTasks.find((t) => t.id === targetTaskId)?.sort_order ?? columnTasks.length)
          : columnTasks.length;

        const updated = { ...task, status: targetStatus, sort_order: newSortOrder };
        updateTaskInStore(updated);

        try {
          await tasksApi.update(workspace.id, task.id, {
            status: targetStatus,
            sort_order: newSortOrder,
          });
        } catch {
          updateTaskInStore(task);
        }
      }
    },
    [tasks, tasksByStatus, workspace, updateTaskInStore, setTasks]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
            isOverColumn={overColumnId === status.id}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <BoardCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
