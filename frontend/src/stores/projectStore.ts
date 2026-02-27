import { create } from 'zustand';
import { projectsApi, type Project } from '../api/projects';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  fetchProjects: (workspaceId: string) => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,

  fetchProjects: async (workspaceId) => {
    set({ isLoading: true });
    const { data } = await projectsApi.list(workspaceId);
    set({ projects: data, isLoading: false });
  },

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (project) =>
    set((state) => ({ projects: state.projects.map((p) => (p.id === project.id ? project : p)) })),
  removeProject: (projectId) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== projectId) })),
}));
