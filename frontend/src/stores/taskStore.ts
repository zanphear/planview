import { create } from 'zustand';
import { tasksApi, type Task } from '../api/tasks';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: (workspaceId: string, params?: Record<string, string>) => Promise<void>;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async (workspaceId, params) => {
    set({ isLoading: true });
    const { data } = await tasksApi.list(workspaceId, params);
    set({ tasks: data, isLoading: false });
  },

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (task) =>
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),
}));
