import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, Layers, PanelRightOpen, PanelRightClose } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TableShape, DecorationType } from '@rfm/shared';
import { useFloorStore } from '@/stores/floorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useUiStore } from '@/stores/uiStore';
import { layoutApi } from '@/api';
import { Spinner } from '@/components/ui/Spinner';
import { FloorCanvas } from '@/components/canvas/FloorCanvas';
import { EditorToolbar } from '@/components/canvas/EditorToolbar';
import { PropertiesPanel } from '@/components/canvas/PropertiesPanel';
import { LayerPanel } from '@/components/canvas/LayerPanel';

export function FloorPlanPage() {
  const currentLayout = useFloorStore((s) => s.currentLayout);
  const layouts = useFloorStore((s) => s.layouts);
  const currentFloor = useFloorStore((s) => s.currentFloor);
  const setCurrentLayout = useFloorStore((s) => s.setCurrentLayout);

  const elements = useCanvasStore((s) => s.elements);
  const setElements = useCanvasStore((s) => s.setElements);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setOffset = useCanvasStore((s) => s.setOffset);

  const propertiesPanelOpen = useUiStore((s) => s.propertiesPanelOpen);
  const togglePropertiesPanel = useUiStore((s) => s.togglePropertiesPanel);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [layerPanelVisible, setLayerPanelVisible] = useState(false);
  const [pendingTableShape, setPendingTableShape] = useState<TableShape | null>(null);
  const [pendingDecorationType, setPendingDecorationType] = useState<DecorationType | null>(null);

  const initialLoadRef = useRef(false);
  const prevElementsRef = useRef(elements);

  // Load elements from layout on mount / layout change
  useEffect(() => {
    if (currentLayout) {
      setElements(currentLayout.elements ?? []);
      initialLoadRef.current = true;
      setHasUnsavedChanges(false);
    }
  }, [currentLayout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track unsaved changes
  useEffect(() => {
    if (!initialLoadRef.current) return;
    // Skip initial load
    if (prevElementsRef.current === elements) return;
    prevElementsRef.current = elements;
    setHasUnsavedChanges(true);
  }, [elements]);

  // Listen for grid snap toggle from keyboard
  useEffect(() => {
    function handleToggle() {
      setGridSnapEnabled((prev) => !prev);
    }
    window.addEventListener('rfm:toggle-grid-snap', handleToggle);
    return () => window.removeEventListener('rfm:toggle-grid-snap', handleToggle);
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- Save ---
  const handleSave = useCallback(async () => {
    if (!currentLayout) return;
    setIsSaving(true);
    try {
      await layoutApi.update(currentLayout.id, { elements });
      setHasUnsavedChanges(false);
      toast.success('Layout saved');
    } catch (err) {
      console.error('Failed to save layout:', err);
      toast.error('Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  }, [currentLayout, elements]);

  // --- Fit to screen ---
  const handleFitToScreen = useCallback(() => {
    if (!currentLayout) return;
    // Calculate bounding box of all elements
    if (elements.length === 0) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const xs = elements.map((el) => el.x);
    const ys = elements.map((el) => el.y);
    const xEnds = elements.map((el) => el.x + el.width);
    const yEnds = elements.map((el) => el.y + el.height);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xEnds);
    const maxY = Math.max(...yEnds);

    const contentWidth = maxX - minX + 100; // padding
    const contentHeight = maxY - minY + 100;

    const container = document.querySelector('[data-canvas-container]');
    if (!container) return;
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setOffset({
      x: containerWidth / 2 - centerX * newZoom,
      y: containerHeight / 2 - centerY * newZoom,
    });
  }, [currentLayout, elements, setZoom, setOffset]);

  // --- Element placed callback ---
  const handleElementPlaced = useCallback(() => {
    setPendingTableShape(null);
    setPendingDecorationType(null);
  }, []);

  // --- Layout selector ---
  const handleLayoutChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const layout = layouts.find((l) => l.id === e.target.value);
      if (layout) {
        setCurrentLayout(layout);
      }
    },
    [layouts, setCurrentLayout],
  );

  // --- No layout state ---
  if (!currentLayout) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Floor Plan Editor
            </h1>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-950">
          {layouts.length === 0 ? (
            <div className="text-center">
              <LayoutDashboard className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                No layouts found. Create a restaurant and floor first.
              </p>
            </div>
          ) : (
            <Spinner size="lg" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar with layout selector */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Floor Plan Editor
          </h1>
          {currentFloor && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {currentFloor.name}
            </span>
          )}
          {layouts.length > 1 && (
            <select
              value={currentLayout.id}
              onChange={handleLayoutChange}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          )}
          {layouts.length === 1 && (
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {currentLayout.name}
              {currentLayout.isActive && ' (Active)'}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLayerPanelVisible(!layerPanelVisible)}
            title="Toggle Layer Panel"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              layerPanelVisible
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={togglePropertiesPanel}
            title="Toggle Properties Panel"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              propertiesPanelOpen
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {propertiesPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onFitToScreen={handleFitToScreen}
        gridSnapEnabled={gridSnapEnabled}
        onToggleGridSnap={() => setGridSnapEnabled(!gridSnapEnabled)}
        onPlaceTable={(shape) => setPendingTableShape(shape)}
        onPlaceDecoration={(type) => setPendingDecorationType(type)}
      />

      {/* Main Content: Canvas + Properties Panel */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="relative flex-1 bg-gray-100 dark:bg-gray-950" data-canvas-container>
          <FloorCanvas
            gridSnapEnabled={gridSnapEnabled}
            pendingTableShape={pendingTableShape}
            pendingDecorationType={pendingDecorationType}
            onElementPlaced={handleElementPlaced}
          />

          {/* Layer Panel (floating) */}
          <LayerPanel
            visible={layerPanelVisible}
            onClose={() => setLayerPanelVisible(false)}
          />
        </div>

        {/* Properties Panel (right sidebar) */}
        {propertiesPanelOpen && (
          <PropertiesPanel onClose={togglePropertiesPanel} />
        )}
      </div>
    </div>
  );
}
