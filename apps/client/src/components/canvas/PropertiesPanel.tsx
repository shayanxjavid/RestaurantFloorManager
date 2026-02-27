import { useCallback } from 'react';
import {
  Lock,
  Unlock,
  Trash2,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  ElementType,
  TableShape,
  DecorationType,
  LAYER_ORDER,
} from '@rfm/shared';
import type { CanvasElement } from '@rfm/shared';

interface PropertiesPanelProps {
  onClose: () => void;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) onChange(parsed);
        }}
        min={min}
        max={max}
        step={step ?? 1}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-gray-300 p-0.5 dark:border-gray-600"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 transition-colors focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 mt-4 border-b border-gray-100 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500">
      {children}
    </h4>
  );
}

export function PropertiesPanel({ onClose }: PropertiesPanelProps) {
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const removeElement = useCanvasStore((s) => s.removeElement);

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const singleElement = selectedElements.length === 1 ? selectedElements[0] : null;

  const update = useCallback(
    (updates: Partial<CanvasElement>) => {
      if (singleElement) {
        updateElement(singleElement.id, updates);
      }
    },
    [singleElement, updateElement],
  );

  const handleAlignLeft = () => {
    if (selectedElements.length < 2) return;
    const minX = Math.min(...selectedElements.map((el) => el.x));
    selectedElements.forEach((el) => updateElement(el.id, { x: minX }));
  };

  const handleAlignCenter = () => {
    if (selectedElements.length < 2) return;
    const minX = Math.min(...selectedElements.map((el) => el.x));
    const maxX = Math.max(...selectedElements.map((el) => el.x + el.width));
    const center = (minX + maxX) / 2;
    selectedElements.forEach((el) =>
      updateElement(el.id, { x: center - el.width / 2 }),
    );
  };

  const handleAlignRight = () => {
    if (selectedElements.length < 2) return;
    const maxX = Math.max(...selectedElements.map((el) => el.x + el.width));
    selectedElements.forEach((el) =>
      updateElement(el.id, { x: maxX - el.width }),
    );
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => removeElement(id));
  };

  // --- No selection ---
  if (selectedElements.length === 0) {
    return (
      <div className="flex h-full w-[280px] flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Properties</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">
            No element selected.
            <br />
            Click an element to view its properties.
          </p>
        </div>
      </div>
    );
  }

  // --- Multi-selection ---
  if (selectedElements.length > 1) {
    return (
      <div className="flex h-full w-[280px] flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Properties</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {selectedElements.length} elements selected
          </p>

          <SectionTitle>Alignment</SectionTitle>
          <div className="flex gap-2">
            <button
              onClick={handleAlignLeft}
              title="Align Left"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <AlignStartVertical className="h-4 w-4" />
            </button>
            <button
              onClick={handleAlignCenter}
              title="Align Center"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <AlignCenterVertical className="h-4 w-4" />
            </button>
            <button
              onClick={handleAlignRight}
              title="Align Right"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <AlignEndVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={handleDeleteSelected}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedElements.length} Elements
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Single element ---
  const el = singleElement!;

  return (
    <div className="flex h-full w-[280px] flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {el.type} Properties
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Close"
        >
          &times;
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {/* Position */}
        <SectionTitle>Position</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="X" value={el.x} onChange={(v) => update({ x: v })} />
          <NumberInput label="Y" value={el.y} onChange={(v) => update({ y: v })} />
          <NumberInput label="Width" value={el.width} onChange={(v) => update({ width: Math.max(5, v) })} min={5} />
          <NumberInput label="Height" value={el.height} onChange={(v) => update({ height: Math.max(5, v) })} min={5} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberInput
            label="Rotation"
            value={el.rotation}
            onChange={(v) => update({ rotation: v })}
            min={0}
            max={360}
            step={5}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Opacity
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={el.opacity ?? 1}
              onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
              className="mt-1.5 w-full accent-brand-600"
            />
            <span className="text-xs text-gray-400">{Math.round((el.opacity ?? 1) * 100)}%</span>
          </div>
        </div>

        {/* Lock Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => update({ locked: !el.locked })}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              el.locked
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {el.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {el.locked ? 'Locked' : 'Unlocked'}
          </button>
        </div>

        {/* Layer */}
        <SectionTitle>Layer</SectionTitle>
        <SelectInput
          label="Layer"
          value={el.layer}
          onChange={(v) => update({ layer: v })}
          options={LAYER_ORDER.map((l) => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) }))}
        />

        {/* Table-specific properties */}
        {el.type === ElementType.TABLE && (
          <>
            <SectionTitle>Table</SectionTitle>
            <div className="space-y-2">
              <NumberInput
                label="Table Number"
                value={el.tableNumber ?? 0}
                onChange={(v) => update({ tableNumber: Math.max(0, Math.round(v)) })}
                min={0}
                step={1}
              />
              <NumberInput
                label="Seats"
                value={el.seats ?? 4}
                onChange={(v) => update({ seats: Math.max(1, Math.round(v)) })}
                min={1}
                step={1}
              />
              <SelectInput
                label="Shape"
                value={el.tableShape ?? TableShape.SQUARE}
                onChange={(v) => update({ tableShape: v as TableShape })}
                options={[
                  { value: TableShape.ROUND, label: 'Round' },
                  { value: TableShape.SQUARE, label: 'Square' },
                  { value: TableShape.RECTANGLE, label: 'Rectangle' },
                  { value: TableShape.BOOTH, label: 'Booth' },
                  { value: TableShape.BAR_STOOL, label: 'Bar Stool' },
                ]}
              />
              <ColorInput
                label="Fill Color"
                value={el.fill ?? '#f3f4f6'}
                onChange={(v) => update({ fill: v })}
              />
            </div>
          </>
        )}

        {/* Wall-specific properties */}
        {el.type === ElementType.WALL && (
          <>
            <SectionTitle>Wall</SectionTitle>
            <div className="space-y-2">
              <NumberInput
                label="Stroke Width"
                value={el.strokeWidth ?? 2}
                onChange={(v) => update({ strokeWidth: Math.max(1, v) })}
                min={1}
                step={1}
              />
              <ColorInput
                label="Stroke Color"
                value={el.strokeColor ?? '#4b5563'}
                onChange={(v) => update({ strokeColor: v })}
              />
              <ColorInput
                label="Fill Color"
                value={el.fill ?? '#6b7280'}
                onChange={(v) => update({ fill: v })}
              />
            </div>
          </>
        )}

        {/* Label-specific properties */}
        {el.type === ElementType.LABEL && (
          <>
            <SectionTitle>Label</SectionTitle>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Text
                </label>
                <textarea
                  value={el.text ?? ''}
                  onChange={(e) => update({ text: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <NumberInput
                label="Font Size"
                value={el.fontSize ?? 14}
                onChange={(v) => update({ fontSize: Math.max(6, v) })}
                min={6}
                max={72}
                step={1}
              />
              <ColorInput
                label="Font Color"
                value={el.fontColor ?? '#1f2937'}
                onChange={(v) => update({ fontColor: v })}
              />
            </div>
          </>
        )}

        {/* Decoration-specific properties */}
        {el.type === ElementType.DECORATION && (
          <>
            <SectionTitle>Decoration</SectionTitle>
            <div className="space-y-2">
              <SelectInput
                label="Type"
                value={el.decorationType ?? DecorationType.PILLAR}
                onChange={(v) => update({ decorationType: v as DecorationType })}
                options={[
                  { value: DecorationType.BAR_COUNTER, label: 'Bar Counter' },
                  { value: DecorationType.KITCHEN, label: 'Kitchen' },
                  { value: DecorationType.ENTRANCE, label: 'Entrance' },
                  { value: DecorationType.RESTROOM, label: 'Restroom' },
                  { value: DecorationType.PLANT, label: 'Plant' },
                  { value: DecorationType.PILLAR, label: 'Pillar' },
                ]}
              />
              <ColorInput
                label="Fill Color"
                value={el.fill ?? '#e5e7eb'}
                onChange={(v) => update({ fill: v })}
              />
            </div>
          </>
        )}

        {/* Delete */}
        <div className="mt-6">
          <button
            onClick={() => removeElement(el.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4" />
            Delete Element
          </button>
        </div>
      </div>
    </div>
  );
}
