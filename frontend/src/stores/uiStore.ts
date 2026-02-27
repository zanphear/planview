import { create } from 'zustand';

type ZoomLevel = 'W' | 'M' | 'Q' | 'A';

interface UIState {
  sidebarCollapsed: boolean;
  zoomLevel: ZoomLevel;
  toggleSidebar: () => void;
  setZoomLevel: (level: ZoomLevel) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  zoomLevel: 'W',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setZoomLevel: (level) => set({ zoomLevel: level }),
}));
