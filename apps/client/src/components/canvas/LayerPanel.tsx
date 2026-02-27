import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { LAYER_ORDER, ElementType } from '@rfm/shared';
import type { LayerName } from '@rfm/shared';

const LAYER_TO_ELEMENT_TYPE: Record<string, ElementType | null> = {
  background: null,
  walls: ElementType.WALL,
  decorations: ElementType.DECORATION,
  tables: ElementType.TABLE,
  labels: ElementType.LABEL,
  sections: null,
};

const LAYER_DISPLAY_NAMES: Record<LayerName, string> = {
  background: 'Background',
  walls: 'Walls',
  decorations: 'Decorations',
  tables: 'Tables',
  labels: 'Labels',
  sections: 'Sections',
};

interface LayerPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function LayerPanel({ visible, onClose }: LayerPanelProps) {
  const elements = useCanvasStore((s) => s.elements);
  const layerVisibility = useCanvasStore((s) => s.layerVisibility);
  const toggleLayerVisibility = useCanvasStore((s) => s.toggleLayerVisibility);
  const updateElement = useCanvasStore((s) => s.updateElement);

  if (!visible) return null;

  const getLayerElementCount = (layer: LayerName): number => {
    return elements.filter((el) => el.layer === layer).length;
  };

  const isLayerLocked = (layer: LayerName): boolean => {
    const layerElements = elements.filter((el) => el.layer === layer);
    if (layerElements.length === 0) return false;
    return layerElements.every((el) => el.locked);
  };

  const toggleLayerLock = (layer: LayerName) => {
    const layerElements = elements.filter((el) => el.layer === layer);
    const allLocked = layerElements.every((el) => el.locked);
    layerElements.forEach((el) => {
      updateElement(el.id, { locked: !allLocked });
    });
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Layers
        </h4>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          &times;
        </button>
      </div>
      <div className="py-1">
        {[...LAYER_ORDER].reverse().map((layer) => {
          const isVisible = layerVisibility[layer];
          const count = getLayerElementCount(layer);
          const locked = isLayerLocked(layer);
          const elementType = LAYER_TO_ELEMENT_TYPE[layer];

          return (
            <div
              key={layer}
              className={`flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                !isVisible ? 'opacity-50' : ''
              }`}
            >
              {/* Visibility toggle */}
              <button
                onClick={() => toggleLayerVisibility(layer)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={isVisible ? 'Hide layer' : 'Show layer'}
              >
                {isVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Lock toggle */}
              <button
                onClick={() => toggleLayerLock(layer)}
                disabled={!elementType || count === 0}
                className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${
                  !elementType || count === 0 ? 'cursor-not-allowed opacity-30' : ''
                }`}
                title={locked ? 'Unlock layer' : 'Lock layer'}
              >
                {locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Layer name */}
              <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                {LAYER_DISPLAY_NAMES[layer]}
              </span>

              {/* Element count */}
              {elementType && (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
