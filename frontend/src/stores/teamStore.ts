import { create } from 'zustand';
import { teamsApi, type Team } from '../api/teams';

interface TeamState {
  teams: Team[];
  isLoading: boolean;
  fetchTeams: (workspaceId: string) => Promise<void>;
  addTeam: (team: Team) => void;
  updateTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  isLoading: false,

  fetchTeams: async (workspaceId) => {
    set({ isLoading: true });
    const { data } = await teamsApi.list(workspaceId);
    set({ teams: data, isLoading: false });
  },

  addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),
  updateTeam: (team) =>
    set((state) => ({ teams: state.teams.map((t) => (t.id === team.id ? team : t)) })),
  removeTeam: (teamId) =>
    set((state) => ({ teams: state.teams.filter((t) => t.id !== teamId) })),
}));
