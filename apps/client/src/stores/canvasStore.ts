import { create } from 'zustand';
import type { CanvasElement } from '@rfm/shared';
import type { LayerName } from '@rfm/shared';

type ToolType = 'select' | 'pan' | 'table' | 'wall' | 'label' | 'decoration';

interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  tool: ToolType;
  gridSize: number;
  zoom: number;
  offset: { x: number; y: number };
  layerVisibility: Record<LayerName, boolean>;
  clipboard: CanvasElement[];
  undoStack: CanvasElement[][];
  redoStack: CanvasElement[][];

  // Element actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  setElements: (elements: CanvasElement[]) => void;

  // Selection actions
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Tool actions
  setTool: (tool: ToolType) => void;

  // Viewport actions
  setZoom: (zoom: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;

  // Layer actions
  toggleLayerVisibility: (layer: LayerName) => void;

  // History actions
  undo: () => void;
  redo: () => void;

  // Clipboard actions
  copySelected: () => void;
  paste: () => void;

  // Grid actions
  snapToGrid: (x: number, y: number) => { x: number; y: number };
  setGridSize: (size: number) => void;
}

function pushUndo(state: CanvasState): Partial<CanvasState> {
  return {
    undoStack: [...state.undoStack.slice(-49), state.elements],
    redoStack: [],
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedIds: [],
  tool: 'select',
  gridSize: 20,
  zoom: 1,
  offset: { x: 0, y: 0 },
  layerVisibility: {
    background: true,
    walls: true,
    decorations: true,
    tables: true,
    labels: true,
    sections: true,
  },
  clipboard: [],
  undoStack: [],
  redoStack: [],

  // ---- Element actions ----

  addElement: (element) => {
    set((state) => ({
      ...pushUndo(state),
      elements: [...state.elements, element],
    }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      ...pushUndo(state),
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    }));
  },

  removeElement: (id) => {
    set((state) => ({
      ...pushUndo(state),
      elements: state.elements.filter((el) => el.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
  },

  setElements: (elements) => {
    set({ elements });
  },

  // ---- Selection actions ----

  setSelectedIds: (ids) => {
    set({ selectedIds: ids });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.elements
        .filter((el) => !el.locked && el.visible)
        .map((el) => el.id),
    }));
  },

  deselectAll: () => {
    set({ selectedIds: [] });
  },

  // ---- Tool actions ----

  setTool: (tool) => {
    set({ tool, selectedIds: [] });
  },

  // ---- Viewport actions ----

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(3, zoom)) });
  },

  setOffset: (offset) => {
    set({ offset });
  },

  // ---- Layer actions ----

  toggleLayerVisibility: (layer) => {
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    }));
  },

  // ---- History actions ----

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const previous = state.undoStack[state.undoStack.length - 1];
      return {
        elements: previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.elements],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        elements: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.elements],
      };
    });
  },

  // ---- Clipboard actions ----

  copySelected: () => {
    const { elements, selectedIds } = get();
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    set({ clipboard: selected });
  },

  paste: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    const pastedElements = clipboard.map((el) => ({
      ...el,
      id: `${el.id}_copy_${Date.now()}`,
      x: el.x + 20,
      y: el.y + 20,
    }));

    set((state) => ({
      ...pushUndo(state),
      elements: [...state.elements, ...pastedElements],
      selectedIds: pastedElements.map((el) => el.id),
    }));
  },

  // ---- Grid actions ----

  snapToGrid: (x, y) => {
    const { gridSize } = get();
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  },

  setGridSize: (size) => {
    set({ gridSize: size });
  },
}));
