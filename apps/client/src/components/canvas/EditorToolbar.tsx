import { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Hand,
  Circle,
  Square,
  RectangleHorizontal,
  Sofa,
  CircleDot,
  Minus,
  Type,
  Undo2,
  Redo2,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Trash2,
  ChevronDown,
  UtensilsCrossed,
  Wine,
  DoorOpen,
  Bath,
  TreePine,
  Columns3,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { TableShape, DecorationType } from '@rfm/shared';

interface EditorToolbarProps {
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onFitToScreen: () => void;
  gridSnapEnabled: boolean;
  onToggleGridSnap: () => void;
  onPlaceTable: (shape: TableShape) => void;
  onPlaceDecoration: (type: DecorationType) => void;
}

const TABLE_SUBTYPES: { shape: TableShape; label: string; icon: React.ReactNode }[] = [
  { shape: TableShape.ROUND, label: 'Round', icon: <Circle className="h-4 w-4" /> },
  { shape: TableShape.SQUARE, label: 'Square', icon: <Square className="h-4 w-4" /> },
  { shape: TableShape.RECTANGLE, label: 'Rectangle', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { shape: TableShape.BOOTH, label: 'Booth', icon: <Sofa className="h-4 w-4" /> },
  { shape: TableShape.BAR_STOOL, label: 'Bar Stool', icon: <CircleDot className="h-4 w-4" /> },
];

const DECORATION_SUBTYPES: { type: DecorationType; label: string; icon: React.ReactNode }[] = [
  { type: DecorationType.KITCHEN, label: 'Kitchen', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { type: DecorationType.BAR_COUNTER, label: 'Bar Counter', icon: <Wine className="h-4 w-4" /> },
  { type: DecorationType.ENTRANCE, label: 'Entrance', icon: <DoorOpen className="h-4 w-4" /> },
  { type: DecorationType.RESTROOM, label: 'Restroom', icon: <Bath className="h-4 w-4" /> },
  { type: DecorationType.PLANT, label: 'Plant', icon: <TreePine className="h-4 w-4" /> },
  { type: DecorationType.PILLAR, label: 'Pillar', icon: <Columns3 className="h-4 w-4" /> },
];

function ToolButton({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      {children}
    </button>
  );
}

function DropdownMenu({
  trigger,
  items,
  align = 'left',
}: {
  trigger: React.ReactNode;
  items: { label: string; icon: React.ReactNode; onClick: () => void }[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1 rounded-md px-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        {trigger}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Separator() {
  return <div className="mx-1.5 h-6 w-px bg-gray-200 dark:bg-gray-700" />;
}

export function EditorToolbar({
  onSave,
  isSaving,
  hasUnsavedChanges,
  onFitToScreen,
  gridSnapEnabled,
  onToggleGridSnap,
  onPlaceTable,
  onPlaceDecoration,
}: EditorToolbarProps) {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const zoom = useCanvasStore((s) => s.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const handleDelete = () => {
    selectedIds.forEach((id) => removeElement(id));
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
      {/* Selection Tools */}
      <ToolButton
        active={tool === 'select'}
        onClick={() => setTool('select')}
        title="Select (V)"
      >
        <MousePointer2 className="h-4 w-4" />
      </ToolButton>

      <ToolButton
        active={tool === 'pan'}
        onClick={() => setTool('pan')}
        title="Pan (Space)"
      >
        <Hand className="h-4 w-4" />
      </ToolButton>

      <Separator />

      {/* Add Table dropdown */}
      <DropdownMenu
        trigger={
          <span className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span className="hidden text-xs font-medium sm:inline">Table</span>
          </span>
        }
        items={TABLE_SUBTYPES.map((t) => ({
          label: t.label,
          icon: t.icon,
          onClick: () => {
            setTool('table');
            onPlaceTable(t.shape);
          },
        }))}
      />

      {/* Wall Tool */}
      <ToolButton
        active={tool === 'wall'}
        onClick={() => setTool('wall')}
        title="Draw Wall"
      >
        <Minus className="h-4 w-4" />
      </ToolButton>

      {/* Label Tool */}
      <ToolButton
        active={tool === 'label'}
        onClick={() => setTool('label')}
        title="Add Label"
      >
        <Type className="h-4 w-4" />
      </ToolButton>

      {/* Decoration dropdown */}
      <DropdownMenu
        trigger={
          <span className="flex items-center gap-1">
            <TreePine className="h-4 w-4" />
            <span className="hidden text-xs font-medium sm:inline">Decor</span>
          </span>
        }
        items={DECORATION_SUBTYPES.map((d) => ({
          label: d.label,
          icon: d.icon,
          onClick: () => {
            setTool('decoration');
            onPlaceDecoration(d.type);
          },
        }))}
      />

      <Separator />

      {/* Undo / Redo */}
      <ToolButton
        onClick={undo}
        title="Undo (Ctrl+Z)"
        disabled={undoStack.length === 0}
      >
        <Undo2 className="h-4 w-4" />
      </ToolButton>

      <ToolButton
        onClick={redo}
        title="Redo (Ctrl+Shift+Z)"
        disabled={redoStack.length === 0}
      >
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <Separator />

      {/* Grid Snap */}
      <ToolButton
        active={gridSnapEnabled}
        onClick={onToggleGridSnap}
        title="Toggle Grid Snap (G)"
      >
        <Grid3X3 className="h-4 w-4" />
      </ToolButton>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out"
          disabled={zoom <= 0.1}
        >
          <ZoomOut className="h-4 w-4" />
        </ToolButton>

        <span className="min-w-[3.25rem] select-none text-center text-xs font-medium text-gray-600 dark:text-gray-400">
          {zoomPercent}%
        </span>

        <ToolButton
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In"
          disabled={zoom >= 5}
        >
          <ZoomIn className="h-4 w-4" />
        </ToolButton>

        <ToolButton onClick={onFitToScreen} title="Fit to Screen">
          <Maximize className="h-4 w-4" />
        </ToolButton>
      </div>

      <Separator />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={isSaving || !hasUnsavedChanges}
        title="Save Layout"
        className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
          hasUnsavedChanges
            ? 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
        } ${isSaving ? 'cursor-wait opacity-70' : ''}`}
      >
        <Save className="h-3.5 w-3.5" />
        {isSaving ? 'Saving...' : 'Save'}
      </button>

      {/* Delete */}
      {selectedIds.length > 0 && (
        <ToolButton onClick={handleDelete} title="Delete Selected (Del)">
          <Trash2 className="h-4 w-4 text-red-500" />
        </ToolButton>
      )}
    </div>
  );
}
