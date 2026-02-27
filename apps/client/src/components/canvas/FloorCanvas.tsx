import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Stage, Layer, Transformer, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '@rfm/shared';
import {
  ElementType,
  TableShape,
  DecorationType,
  DEFAULT_TABLE_SEATS,
  DEFAULT_TABLE_DIMENSIONS,
} from '@rfm/shared';
import { useCanvasStore } from '@/stores/canvasStore';
import { useFloorStore } from '@/stores/floorStore';
import { Grid } from './Grid';
import { TableShapeComponent } from './TableShape';
import { WallShape } from './WallShape';
import { LabelShape } from './LabelShape';
import { DecorationShape } from './DecorationShape';

interface FloorCanvasProps {
  gridSnapEnabled: boolean;
  pendingTableShape: TableShape | null;
  pendingDecorationType: DecorationType | null;
  onElementPlaced: () => void;
}

/** Next table number: max existing + 1 */
function getNextTableNumber(elements: CanvasElement[]): number {
  const tableNums = elements
    .filter((el) => el.type === ElementType.TABLE && el.tableNumber != null)
    .map((el) => el.tableNumber as number);
  return tableNums.length > 0 ? Math.max(...tableNums) + 1 : 1;
}

export function FloorCanvas({
  gridSnapEnabled,
  pendingTableShape,
  pendingDecorationType,
  onElementPlaced,
}: FloorCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [wallDragStart, setWallDragStart] = useState<{ x: number; y: number } | null>(null);
  const [wallDragCurrent, setWallDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Store state
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const tool = useCanvasStore((s) => s.tool);
  const gridSize = useCanvasStore((s) => s.gridSize);
  const zoom = useCanvasStore((s) => s.zoom);
  const offset = useCanvasStore((s) => s.offset);
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const setTool = useCanvasStore((s) => s.setTool);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setOffset = useCanvasStore((s) => s.setOffset);
  const addElement = useCanvasStore((s) => s.addElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const selectAll = useCanvasStore((s) => s.selectAll);
  const deselectAll = useCanvasStore((s) => s.deselectAll);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const copySelected = useCanvasStore((s) => s.copySelected);
  const paste = useCanvasStore((s) => s.paste);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);

  const sections = useFloorStore((s) => s.sections);

  // --- Resize observer ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    // Set initial size
    setContainerSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  // --- Transformer sync ---
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const node = stage.findOne(`#${id}`);
      if (node) nodes.push(node);
    }
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Delete/Backspace: remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        selectedIds.forEach((id) => removeElement(id));
        return;
      }

      // Ctrl/Cmd combos
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key === 'z') {
          e.preventDefault();
          undo();
          return;
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key === 'c') {
          e.preventDefault();
          copySelected();
          return;
        }
        if (e.key === 'v') {
          e.preventDefault();
          paste();
          return;
        }
        if (e.key === 'a') {
          e.preventDefault();
          selectAll();
          return;
        }
      }

      // Escape: deselect / switch to select
      if (e.key === 'Escape') {
        if (selectedIds.length > 0) {
          deselectAll();
        } else {
          setTool('select');
        }
        return;
      }

      // G: toggle grid snap
      if (e.key === 'g' || e.key === 'G') {
        // This is handled by the parent page via a state toggle
        // We dispatch a custom event so FloorPlanPage can react
        window.dispatchEvent(new CustomEvent('rfm:toggle-grid-snap'));
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, removeElement, undo, redo, copySelected, paste, selectAll, deselectAll, setTool]);

  // --- Mouse wheel zoom ---
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldZoom = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.08;
      const newZoom = Math.max(0.1, Math.min(5, direction > 0 ? oldZoom * factor : oldZoom / factor));

      // Zoom toward cursor position
      const mousePointTo = {
        x: (pointer.x - offset.x) / oldZoom,
        y: (pointer.y - offset.y) / oldZoom,
      };

      const newOffset = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      };

      setZoom(newZoom);
      setOffset(newOffset);
    },
    [zoom, offset, setZoom, setOffset],
  );

  // --- Get canvas coordinates from pointer ---
  const getCanvasPoint = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - offset.x) / zoom,
      y: (pointer.y - offset.y) / zoom,
    };
  }, [offset, zoom]);

  // --- Handle element selection ---
  const handleSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      if (tool !== 'select') return;
      if (shiftKey) {
        if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter((sid) => sid !== id));
        } else {
          setSelectedIds([...selectedIds, id]);
        }
      } else {
        setSelectedIds([id]);
      }
    },
    [tool, selectedIds, setSelectedIds],
  );

  // --- Stage mouse handlers ---
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle-click pan
      if (e.evt.button === 1) {
        e.evt.preventDefault();
        setIsPanning(true);
        return;
      }

      // Left-click pan when pan tool active
      if (tool === 'pan' && e.evt.button === 0) {
        setIsPanning(true);
        return;
      }

      // Wall drawing start
      if (tool === 'wall' && e.evt.button === 0) {
        const point = getCanvasPoint();
        if (point) {
          const snapped = gridSnapEnabled ? snapToGrid(point.x, point.y) : point;
          setWallDragStart(snapped);
          setWallDragCurrent(snapped);
        }
        return;
      }

      // Click on empty stage to deselect (only for select tool)
      if (e.target === e.target.getStage()) {
        if (tool === 'select') {
          deselectAll();
          return;
        }

        // Place table
        if (tool === 'table' && e.evt.button === 0) {
          const point = getCanvasPoint();
          if (!point) return;
          const snapped = gridSnapEnabled ? snapToGrid(point.x, point.y) : point;
          const shape = pendingTableShape ?? TableShape.SQUARE;
          const dims = DEFAULT_TABLE_DIMENSIONS[shape];
          const seats = DEFAULT_TABLE_SEATS[shape];
          const tableNum = getNextTableNumber(elements);

          const newElement: CanvasElement = {
            id: crypto.randomUUID(),
            type: ElementType.TABLE,
            x: snapped.x - dims.width / 2,
            y: snapped.y - dims.height / 2,
            width: dims.width,
            height: dims.height,
            rotation: 0,
            layer: 'tables',
            locked: false,
            visible: true,
            tableNumber: tableNum,
            tableShape: shape,
            seats,
            opacity: 1,
          };
          addElement(newElement);
          onElementPlaced();
          setTool('select');
          setSelectedIds([newElement.id]);
          return;
        }

        // Place label
        if (tool === 'label' && e.evt.button === 0) {
          const point = getCanvasPoint();
          if (!point) return;
          const snapped = gridSnapEnabled ? snapToGrid(point.x, point.y) : point;

          const newElement: CanvasElement = {
            id: crypto.randomUUID(),
            type: ElementType.LABEL,
            x: snapped.x,
            y: snapped.y,
            width: 120,
            height: 24,
            rotation: 0,
            layer: 'labels',
            locked: false,
            visible: true,
            text: 'Label',
            fontSize: 14,
            fontColor: '#1f2937',
            opacity: 1,
          };
          addElement(newElement);
          onElementPlaced();
          setTool('select');
          setSelectedIds([newElement.id]);
          return;
        }

        // Place decoration
        if (tool === 'decoration' && e.evt.button === 0) {
          const point = getCanvasPoint();
          if (!point) return;
          const snapped = gridSnapEnabled ? snapToGrid(point.x, point.y) : point;
          const decoType = pendingDecorationType ?? DecorationType.PILLAR;

          let w = 40;
          let h = 40;
          switch (decoType) {
            case DecorationType.BAR_COUNTER:
              w = 200;
              h = 40;
              break;
            case DecorationType.KITCHEN:
              w = 160;
              h = 100;
              break;
            case DecorationType.ENTRANCE:
              w = 80;
              h = 40;
              break;
            case DecorationType.RESTROOM:
              w = 60;
              h = 60;
              break;
            case DecorationType.PLANT:
              w = 30;
              h = 30;
              break;
            case DecorationType.PILLAR:
              w = 20;
              h = 20;
              break;
          }

          const newElement: CanvasElement = {
            id: crypto.randomUUID(),
            type: ElementType.DECORATION,
            x: snapped.x - w / 2,
            y: snapped.y - h / 2,
            width: w,
            height: h,
            rotation: 0,
            layer: 'decorations',
            locked: false,
            visible: true,
            decorationType: decoType,
            opacity: 1,
          };
          addElement(newElement);
          onElementPlaced();
          setTool('select');
          setSelectedIds([newElement.id]);
          return;
        }
      }
    },
    [
      tool,
      gridSnapEnabled,
      snapToGrid,
      getCanvasPoint,
      deselectAll,
      pendingTableShape,
      pendingDecorationType,
      elements,
      addElement,
      onElementPlaced,
      setTool,
      setSelectedIds,
    ],
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Panning
      if (isPanning) {
        setOffset({
          x: offset.x + e.evt.movementX,
          y: offset.y + e.evt.movementY,
        });
        return;
      }

      // Wall drag preview
      if (wallDragStart) {
        const point = getCanvasPoint();
        if (point) {
          const snapped = gridSnapEnabled ? snapToGrid(point.x, point.y) : point;
          setWallDragCurrent(snapped);
        }
      }
    },
    [isPanning, offset, setOffset, wallDragStart, getCanvasPoint, gridSnapEnabled, snapToGrid],
  );

  const handleStageMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      // End panning
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      // Finalize wall
      if (wallDragStart && wallDragCurrent) {
        const dx = wallDragCurrent.x - wallDragStart.x;
        const dy = wallDragCurrent.y - wallDragStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Only create if minimum length
        if (length >= 10) {
          const minX = Math.min(wallDragStart.x, wallDragCurrent.x);
          const minY = Math.min(wallDragStart.y, wallDragCurrent.y);
          const w = Math.max(Math.abs(dx), 6);
          const h = Math.max(Math.abs(dy), 6);

          const newElement: CanvasElement = {
            id: crypto.randomUUID(),
            type: ElementType.WALL,
            x: minX,
            y: minY,
            width: w,
            height: h,
            rotation: 0,
            layer: 'walls',
            locked: false,
            visible: true,
            strokeWidth: 2,
            strokeColor: '#4b5563',
            fill: '#6b7280',
            opacity: 1,
          };
          addElement(newElement);
          onElementPlaced();
          setSelectedIds([newElement.id]);
        }

        setWallDragStart(null);
        setWallDragCurrent(null);
        setTool('select');
        return;
      }
    },
    [isPanning, wallDragStart, wallDragCurrent, addElement, onElementPlaced, setSelectedIds, setTool],
  );

  // --- Group elements by layer ---
  const elementsByLayer = useMemo(() => {
    const groups: Record<string, CanvasElement[]> = {
      walls: [],
      decorations: [],
      tables: [],
      labels: [],
    };

    elements.forEach((el) => {
      if (!el.visible) return;
      const layer = el.layer || 'tables';
      if (groups[layer]) {
        groups[layer].push(el);
      }
    });

    return groups;
  }, [elements]);

  // --- Section overlay rectangles ---
  const sectionOverlays = useMemo(() => {
    if (!layerVisibility.sections) return [];

    return sections
      .filter((s) => s.tables && s.tables.length > 0)
      .map((section) => {
        const sectionTables = section.tables!;
        if (sectionTables.length === 0) return null;

        const minX = Math.min(...sectionTables.map((t) => t.x));
        const minY = Math.min(...sectionTables.map((t) => t.y));
        const maxX = Math.max(...sectionTables.map((t) => t.x + t.width));
        const maxY = Math.max(...sectionTables.map((t) => t.y + t.height));
        const padding = 15;

        return {
          id: section.id,
          x: minX - padding,
          y: minY - padding,
          width: maxX - minX + padding * 2,
          height: maxY - minY + padding * 2,
          color: section.color,
          name: section.name,
        };
      })
      .filter(Boolean) as {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      name: string;
    }[];
  }, [sections, layerVisibility.sections]);

  // --- Cursor style ---
  const cursorStyle = useMemo(() => {
    if (isPanning) return 'grabbing';
    if (tool === 'pan') return 'grab';
    if (tool === 'wall') return 'crosshair';
    if (tool === 'table' || tool === 'label' || tool === 'decoration') return 'copy';
    return 'default';
  }, [tool, isPanning]);

  const renderElement = useCallback(
    (el: CanvasElement) => {
      const isSelected = selectedIds.includes(el.id);

      switch (el.type) {
        case ElementType.TABLE:
          return (
            <TableShapeComponent
              key={el.id}
              element={el}
              isSelected={isSelected}
              onSelect={handleSelect}
              gridSnap={gridSnapEnabled}
            />
          );
        case ElementType.WALL:
          return (
            <WallShape
              key={el.id}
              element={el}
              isSelected={isSelected}
              onSelect={handleSelect}
              gridSnap={gridSnapEnabled}
            />
          );
        case ElementType.LABEL:
          return (
            <LabelShape
              key={el.id}
              element={el}
              isSelected={isSelected}
              onSelect={handleSelect}
              gridSnap={gridSnapEnabled}
              stageRef={stageRef}
            />
          );
        case ElementType.DECORATION:
          return (
            <DecorationShape
              key={el.id}
              element={el}
              isSelected={isSelected}
              onSelect={handleSelect}
              gridSnap={gridSnapEnabled}
            />
          );
        default:
          return null;
      }
    },
    [selectedIds, handleSelect, gridSnapEnabled],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: cursorStyle }}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={offset.x}
        y={offset.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        {/* Background / Grid Layer */}
        {layerVisibility.background && (
          <Layer listening={false}>
            <Grid
              width={containerSize.width}
              height={containerSize.height}
              gridSize={gridSize}
              zoom={zoom}
              offsetX={offset.x}
              offsetY={offset.y}
            />
          </Layer>
        )}

        {/* Section overlays */}
        {sectionOverlays.length > 0 && (
          <Layer listening={false}>
            {sectionOverlays.map((overlay) => (
              <Rect
                key={overlay.id}
                x={overlay.x}
                y={overlay.y}
                width={overlay.width}
                height={overlay.height}
                fill={overlay.color}
                opacity={0.08}
                cornerRadius={8}
                stroke={overlay.color}
                strokeWidth={1.5 / zoom}
                dash={[6 / zoom, 4 / zoom]}
              />
            ))}
          </Layer>
        )}

        {/* Walls layer */}
        {layerVisibility.walls && (
          <Layer>
            {elementsByLayer.walls.map(renderElement)}
          </Layer>
        )}

        {/* Decorations layer */}
        {layerVisibility.decorations && (
          <Layer>
            {elementsByLayer.decorations.map(renderElement)}
          </Layer>
        )}

        {/* Tables layer */}
        {layerVisibility.tables && (
          <Layer>
            {elementsByLayer.tables.map(renderElement)}
          </Layer>
        )}

        {/* Labels layer */}
        {layerVisibility.labels && (
          <Layer>
            {elementsByLayer.labels.map(renderElement)}
          </Layer>
        )}

        {/* Wall drag preview */}
        {wallDragStart && wallDragCurrent && (
          <Layer listening={false}>
            <Rect
              x={Math.min(wallDragStart.x, wallDragCurrent.x)}
              y={Math.min(wallDragStart.y, wallDragCurrent.y)}
              width={Math.max(Math.abs(wallDragCurrent.x - wallDragStart.x), 6)}
              height={Math.max(Math.abs(wallDragCurrent.y - wallDragStart.y), 6)}
              fill="#6b7280"
              opacity={0.4}
              stroke="#4b5563"
              strokeWidth={1.5 / zoom}
              dash={[4 / zoom, 3 / zoom]}
            />
          </Layer>
        )}

        {/* Transformer layer (always on top) */}
        <Layer>
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            anchorSize={8 / zoom}
            anchorCornerRadius={2 / zoom}
            borderStroke="#3b82f6"
            borderStrokeWidth={1.5 / zoom}
            anchorStroke="#3b82f6"
            anchorFill="#ffffff"
            anchorStrokeWidth={1.5 / zoom}
            rotateAnchorOffset={20 / zoom}
            padding={4 / zoom}
            boundBoxFunc={(oldBox, newBox) => {
              // Minimum size constraint
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
