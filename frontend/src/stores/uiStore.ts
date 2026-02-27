import { create } from 'zustand';

type ZoomLevel = 'W' | 'M' | 'Q' | 'A';

interface UIState {
  sidebarCollapsed: boolean;
  zoomLevel: ZoomLevel;
  darkMode: boolean;
  quickSearchOpen: boolean;
  taskboxOpen: boolean;
  toggleSidebar: () => void;
  setZoomLevel: (level: ZoomLevel) => void;
  toggleDarkMode: () => void;
  setDarkMode: (on: boolean) => void;
  setQuickSearchOpen: (open: boolean) => void;
  setTaskboxOpen: (open: boolean) => void;
}

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem('planview-dark-mode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(on: boolean) {
  document.documentElement.classList.toggle('dark', on);
  localStorage.setItem('planview-dark-mode', String(on));
}

// Apply on load
const initialDark = getInitialDarkMode();
applyDarkMode(initialDark);

function getInitialSidebarCollapsed(): boolean {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768;
  }
  return false;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: getInitialSidebarCollapsed(),
  zoomLevel: 'W',
  darkMode: initialDark,
  quickSearchOpen: false,
  taskboxOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setZoomLevel: (level) => set({ zoomLevel: level }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      applyDarkMode(next);
      return { darkMode: next };
    }),
  setDarkMode: (on) => {
    applyDarkMode(on);
    set({ darkMode: on });
  },
  setQuickSearchOpen: (open) => set({ quickSearchOpen: open }),
  setTaskboxOpen: (open) => set({ taskboxOpen: open }),
}));
