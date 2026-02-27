import { useCallback } from 'react';
import { tasksApi, type Task } from '../api/tasks';
import { useWorkspaceStore } from '../stores/workspaceStore';

/**
 * Returns a handler for context menu actions on tasks (status change, duplicate, delete).
 */
export function useTaskContextActions(
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  setSelectedTask?: (task: Task | null) => void,
) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useCallback(async (action: string, task: Task) => {
    if (!workspace) return;
    try {
      if (action.startsWith('status:')) {
        const status = action.split(':')[1];
        const { data } = await tasksApi.update(workspace.id, task.id, { status });
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
      } else if (action === 'duplicate') {
        const { data } = await tasksApi.create(workspace.id, {
          name: `${task.name} (copy)`,
          status: task.status,
          date_from: task.date_from || undefined,
          date_to: task.date_to || undefined,
          colour: task.colour || undefined,
          project_id: task.project_id || undefined,
          segment_id: task.segment_id || undefined,
          assignee_ids: task.assignees.map((a) => a.id),
        });
        setTasks((prev) => [...prev, data]);
      } else if (action === 'delete') {
        await tasksApi.delete(workspace.id, task.id);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      } else if (action === 'colour') {
        // Open task detail panel so they can pick a colour
        setSelectedTask?.(task);
      }
    } catch (err) {
      console.error('Context action failed:', err);
    }
  }, [workspace, setTasks, setSelectedTask]);
}
