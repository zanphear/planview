import { create } from 'zustand';
import { peopleApi, type PersonProfile, type OrgChartNode } from '../api/people';

interface PeopleState {
  profiles: PersonProfile[];
  orgChart: OrgChartNode[];
  isLoading: boolean;
  fetchProfiles: (workspaceId: string) => Promise<void>;
  fetchOrgChart: (workspaceId: string) => Promise<void>;
  updateProfile: (profile: PersonProfile) => void;
  addProfile: (profile: PersonProfile) => void;
}

export const usePeopleStore = create<PeopleState>((set) => ({
  profiles: [],
  orgChart: [],
  isLoading: false,

  fetchProfiles: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await peopleApi.list(workspaceId);
      set({ profiles: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchOrgChart: async (workspaceId) => {
    try {
      const { data } = await peopleApi.getOrgChart(workspaceId);
      set({ orgChart: data });
    } catch {
      // ignore
    }
  },

  updateProfile: (profile) => {
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === profile.id ? profile : p)),
    }));
  },

  addProfile: (profile) => {
    set((state) => ({ profiles: [...state.profiles, profile] }));
  },
}));
