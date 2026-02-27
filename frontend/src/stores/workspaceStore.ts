import { create } from 'zustand';
import { api } from '../api/client';

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,

  fetchWorkspaces: async () => {
    const { data } = await api.get<Workspace[]>('/workspaces');
    set({ workspaces: data });
    if (data.length > 0) {
      set({ currentWorkspace: data[0] });
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
