import { create } from 'zustand';
import { lookupsApi, type LookupValue } from '../api/lookups';

interface LookupState {
  cache: Record<string, LookupValue[]>;
  loading: Record<string, boolean>;
  workspaceId: string | null;
  fetchCategory: (workspaceId: string, category: string) => Promise<void>;
  fetchAll: (workspaceId: string) => Promise<void>;
  invalidate: (category?: string) => void;
}

export const useLookupStore = create<LookupState>((set, get) => ({
  cache: {},
  loading: {},
  workspaceId: null,

  fetchCategory: async (workspaceId: string, category: string) => {
    const state = get();
    // Reset cache if workspace changed
    if (state.workspaceId !== workspaceId) {
      set({ cache: {}, loading: {}, workspaceId: workspaceId });
    }
    if (state.loading[category]) return;
    if (state.cache[category]) return;
    set({ loading: { ...get().loading, [category]: true } });
    try {
      const res = await lookupsApi.list(workspaceId, category);
      set({
        cache: { ...get().cache, [category]: res.data },
        loading: { ...get().loading, [category]: false },
      });
    } catch {
      set({ loading: { ...get().loading, [category]: false } });
    }
  },

  fetchAll: async (workspaceId: string) => {
    set({ workspaceId: workspaceId });
    try {
      const res = await lookupsApi.listAll(workspaceId);
      set({ cache: res.data });
    } catch {
      // ignore
    }
  },

  invalidate: (category?: string) => {
    if (category) {
      const cache = { ...get().cache };
      delete cache[category];
      set({ cache });
    } else {
      set({ cache: {} });
    }
  },
}));

/**
 * Hook to get lookup values for a category.
 * Triggers a fetch if not cached. Safe to call during render.
 */
export function useLookupValues(workspaceId: string | undefined, category: string): LookupValue[] {
  const cache = useLookupStore((s) => s.cache[category]);
  const loading = useLookupStore((s) => s.loading[category]);
  const fetchCategory = useLookupStore((s) => s.fetchCategory);

  if (workspaceId && !cache && !loading) {
    // Schedule fetch outside of render via microtask
    Promise.resolve().then(() => fetchCategory(workspaceId, category));
  }

  return (cache || []).filter((v) => v.is_active);
}
