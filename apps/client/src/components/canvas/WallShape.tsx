import { useRef, useCallback } from 'react';
import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '@rfm/shared';
import { useCanvasStore } from '@/stores/canvasStore';

interface WallShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  gridSnap: boolean;
}

export function WallShape({ element, isSelected, onSelect, gridSnap }: WallShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);

  const strokeColor = element.strokeColor ?? '#4b5563';
  const strokeWidth = element.strokeWidth ?? 2;
  const fill = element.fill ?? '#6b7280';

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      let newX = e.target.x();
      let newY = e.target.y();
      if (gridSnap) {
        const snapped = snapToGrid(newX, newY);
        newX = snapped.x;
        newY = snapped.y;
        e.target.x(newX);
        e.target.y(newY);
      }
      updateElement(element.id, { x: newX, y: newY });
    },
    [element.id, gridSnap, snapToGrid, updateElement],
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    updateElement(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, element.width * scaleX),
      height: Math.max(5, element.height * scaleY),
      rotation: node.rotation(),
    });
  }, [element.id, element.width, element.height, updateElement]);

  const selectionStroke = isSelected ? '#3b82f6' : strokeColor;
  const selectionStrokeWidth = isSelected ? strokeWidth + 1.5 : strokeWidth;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={!element.locked}
      opacity={element.opacity ?? 1}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(element.id, e.evt.shiftKey);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(element.id, false);
      }}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Rect
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        fill={fill}
        stroke={selectionStroke}
        strokeWidth={selectionStrokeWidth}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={3}
        shadowOffsetY={1}
      />
    </Group>
  );
}
