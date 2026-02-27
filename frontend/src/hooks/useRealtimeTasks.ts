import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useWSEvent } from './WebSocketContext';
import type { Task } from '../api/tasks';

/**
 * Subscribes to real-time task events and updates local state.
 *
 * @param setTasks - state setter for the tasks array
 * @param filter - optional function to decide if a created task belongs in this view
 */
export function useRealtimeTasks(
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  filter?: (task: Task) => boolean,
) {
  const userId = useAuthStore((s) => s.user?.id);

  const handleCreated = useCallback((data: Record<string, unknown>) => {
    // Don't duplicate tasks we created ourselves (already in local state)
    if (data.actor_id === userId) return;

    const task = data.task as Task;
    if (filter && !filter(task)) return;
    setTasks((prev) => {
      // Avoid duplicates
      if (prev.some((t) => t.id === task.id)) return prev;
      return [...prev, task];
    });
  }, [setTasks, filter, userId]);

  const handleUpdated = useCallback((data: Record<string, unknown>) => {
    const task = data.task as Task;
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) {
        // Update in place
        return prev.map((t) => (t.id === task.id ? task : t));
      }
      // Task may have been moved into this view (e.g. reassigned to this user)
      if (filter && filter(task)) {
        return [...prev, task];
      }
      return prev;
    });
  }, [setTasks, filter]);

  const handleDeleted = useCallback((data: Record<string, unknown>) => {
    const taskId = data.task_id as string;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, [setTasks]);

  useWSEvent('task.created', handleCreated, [handleCreated]);
  useWSEvent('task.updated', handleUpdated, [handleUpdated]);
  useWSEvent('task.deleted', handleDeleted, [handleDeleted]);
}
