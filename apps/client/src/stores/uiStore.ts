import { create } from 'zustand';

type ActivePanel = 'editor' | 'sections' | 'tables' | 'shifts';

interface UiState {
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  darkMode: boolean;
  activePanel: ActivePanel;

  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleDarkMode: () => void;
  setActivePanel: (panel: ActivePanel) => void;
}

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('rfm_dark_mode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  propertiesPanelOpen: false,
  darkMode: getInitialDarkMode(),
  activePanel: 'editor',

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  togglePropertiesPanel: () => {
    set((state) => ({ propertiesPanelOpen: !state.propertiesPanelOpen }));
  },

  toggleDarkMode: () => {
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem('rfm_dark_mode', String(next));
      return { darkMode: next };
    });
  },

  setActivePanel: (panel) => {
    set({ activePanel: panel });
  },
}));
