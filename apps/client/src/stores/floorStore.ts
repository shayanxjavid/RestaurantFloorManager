import { create } from 'zustand';
import type {
  Restaurant,
  Floor,
  Layout,
  Section,
  TableConfig,
  TableStatusEntry,
} from '@rfm/shared';
import { restaurantApi, layoutApi, sectionApi, tableApi } from '@/api';

interface FloorState {
  restaurant: Restaurant | null;
  floors: Floor[];
  currentFloor: Floor | null;
  currentLayout: Layout | null;
  layouts: Layout[];
  sections: Section[];
  tables: TableConfig[];
  tableStatuses: Record<string, TableStatusEntry>;

  // Actions
  loadRestaurant: (id: string) => Promise<void>;
  setCurrentFloor: (floor: Floor) => void;
  setCurrentLayout: (layout: Layout) => void;
  loadLayout: (layoutId: string) => Promise<void>;
  loadLayouts: (floorId: string) => Promise<void>;
  loadSections: (layoutId: string) => Promise<void>;
  loadTables: (layoutId: string) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatusEntry) => void;
  addSection: (section: Section) => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  reset: () => void;
}

const initialState = {
  restaurant: null,
  floors: [],
  currentFloor: null,
  currentLayout: null,
  layouts: [],
  sections: [],
  tables: [],
  tableStatuses: {},
};

export const useFloorStore = create<FloorState>((set, get) => ({
  ...initialState,

  loadRestaurant: async (id) => {
    const data = await restaurantApi.get(id);
    const { floors, ...restaurant } = data;
    set({ restaurant, floors });

    // Auto-select first floor if available
    if (floors.length > 0) {
      const firstFloor = floors[0];
      set({ currentFloor: firstFloor });
      await get().loadLayouts(firstFloor.id);
    }
  },

  setCurrentFloor: (floor) => {
    set({ currentFloor: floor, currentLayout: null, sections: [], tables: [] });
    get().loadLayouts(floor.id);
  },

  setCurrentLayout: (layout) => {
    set({ currentLayout: layout });
    get().loadSections(layout.id);
    get().loadTables(layout.id);
  },

  loadLayout: async (layoutId) => {
    const layout = await layoutApi.get(layoutId);
    set({ currentLayout: layout });
    await Promise.all([
      get().loadSections(layoutId),
      get().loadTables(layoutId),
    ]);
  },

  loadLayouts: async (floorId) => {
    const layouts = await layoutApi.getByFloor(floorId);
    set({ layouts });

    // Auto-select active layout
    const activeLayout = layouts.find((l) => l.isActive);
    if (activeLayout) {
      get().setCurrentLayout(activeLayout);
    } else if (layouts.length > 0) {
      get().setCurrentLayout(layouts[0]);
    }
  },

  loadSections: async (layoutId) => {
    const sections = await sectionApi.getByLayout(layoutId);
    set({ sections });
  },

  loadTables: async (layoutId) => {
    const tables = await tableApi.getByLayout(layoutId);
    set({ tables });
  },

  updateTableStatus: (tableId, status) => {
    set((state) => ({
      tableStatuses: {
        ...state.tableStatuses,
        [tableId]: status,
      },
    }));
  },

  addSection: (section) => {
    set((state) => ({
      sections: [...state.sections, section],
    }));
  },

  removeSection: (sectionId) => {
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== sectionId),
    }));
  },

  updateSection: (sectionId, updates) => {
    set((state) => ({
      sections: state.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s,
      ),
    }));
  },

  reset: () => {
    set(initialState);
  },
}));
