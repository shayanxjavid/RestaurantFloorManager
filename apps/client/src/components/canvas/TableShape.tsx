import { useRef, useCallback } from 'react';
import { Group, Circle, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement, TableStatusEntry } from '@rfm/shared';
import { TableShape as TableShapeEnum, TableStatus, TABLE_STATUS_COLORS } from '@rfm/shared';
import { useCanvasStore } from '@/stores/canvasStore';
import { useFloorStore } from '@/stores/floorStore';

interface TableShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  gridSnap: boolean;
}

function getChairPositions(
  shape: TableShapeEnum,
  seats: number,
  width: number,
  height: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const chairOffset = 10;

  if (shape === TableShapeEnum.ROUND) {
    const radius = width / 2 + chairOffset;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      positions.push({
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      });
    }
  } else if (shape === TableShapeEnum.BAR_STOOL) {
    // Single stool, no surrounding chairs
    return [];
  } else if (shape === TableShapeEnum.BOOTH) {
    // Chairs only on one side (the open side, bottom)
    const spacing = width / (seats + 1);
    for (let i = 1; i <= seats; i++) {
      positions.push({ x: spacing * i, y: height + chairOffset });
    }
  } else {
    // SQUARE or RECTANGLE: distribute chairs around all four sides
    const perSide = Math.ceil(seats / 4);
    const sides = [
      { axis: 'x' as const, fixed: 'y' as const, fixedVal: -chairOffset, min: 0, max: width },
      { axis: 'x' as const, fixed: 'y' as const, fixedVal: height + chairOffset, min: 0, max: width },
      { axis: 'y' as const, fixed: 'x' as const, fixedVal: -chairOffset, min: 0, max: height },
      { axis: 'y' as const, fixed: 'x' as const, fixedVal: width + chairOffset, min: 0, max: height },
    ];
    let remaining = seats;
    for (const side of sides) {
      if (remaining <= 0) break;
      const count = Math.min(perSide, remaining);
      const spacing = (side.max - side.min) / (count + 1);
      for (let i = 1; i <= count; i++) {
        const pos = { x: 0, y: 0 };
        pos[side.axis] = side.min + spacing * i;
        pos[side.fixed] = side.fixedVal;
        positions.push(pos);
      }
      remaining -= count;
    }
  }

  return positions;
}

export function TableShapeComponent({ element, isSelected, onSelect, gridSnap }: TableShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const tableStatuses = useFloorStore((s) => s.tableStatuses);
  const sections = useFloorStore((s) => s.sections);

  const shape = element.tableShape ?? TableShapeEnum.SQUARE;
  const seats = element.seats ?? 4;
  const { width, height } = element;
  const tableNum = element.tableNumber ?? 0;

  // Determine table fill color based on status
  const statusEntry: TableStatusEntry | undefined = tableStatuses[element.id];
  const status = statusEntry?.status ?? TableStatus.AVAILABLE;
  const statusColor = TABLE_STATUS_COLORS[status];

  // Check if table belongs to a section for tint
  const tableSection = sections.find(
    (s) => s.tables?.some((t) => t.elementId === element.id),
  );
  const sectionTint = tableSection?.color;

  const baseFill = element.fill ?? statusColor ?? '#f3f4f6';

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
    // Reset scale to 1 and apply to width/height
    node.scaleX(1);
    node.scaleY(1);
    updateElement(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, element.width * scaleX),
      height: Math.max(20, element.height * scaleY),
      rotation: node.rotation(),
    });
  }, [element.id, element.width, element.height, updateElement]);

  const chairPositions = getChairPositions(shape, seats, width, height);
  const chairRadius = Math.min(6, width * 0.08, height * 0.08);

  const strokeColor = isSelected ? '#3b82f6' : (sectionTint ?? '#9ca3af');
  const strokeWidth = isSelected ? 2.5 : 1;

  const fontSize = Math.min(14, width * 0.22, height * 0.22);
  const seatFontSize = Math.min(10, fontSize * 0.7);

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
      {/* Section tint background */}
      {sectionTint && shape === TableShapeEnum.ROUND && (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2 + 4}
          fill={sectionTint}
          opacity={0.15}
          listening={false}
        />
      )}
      {sectionTint && shape !== TableShapeEnum.ROUND && (
        <Rect
          x={-4}
          y={-4}
          width={width + 8}
          height={height + 8}
          fill={sectionTint}
          opacity={0.15}
          cornerRadius={4}
          listening={false}
        />
      )}

      {/* Table shape */}
      {shape === TableShapeEnum.ROUND && (
        <Circle
          x={width / 2}
          y={height / 2}
          radius={width / 2}
          fill={baseFill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={4}
          shadowOffsetY={2}
        />
      )}

      {shape === TableShapeEnum.SQUARE && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={baseFill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          cornerRadius={6}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={4}
          shadowOffsetY={2}
        />
      )}

      {shape === TableShapeEnum.RECTANGLE && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={baseFill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          cornerRadius={4}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={4}
          shadowOffsetY={2}
        />
      )}

      {shape === TableShapeEnum.BOOTH && (
        <>
          {/* Booth cushion back */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height * 0.4}
            fill="#7c6548"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            cornerRadius={[12, 12, 0, 0]}
          />
          {/* Booth table surface */}
          <Rect
            x={4}
            y={height * 0.35}
            width={width - 8}
            height={height * 0.65}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            cornerRadius={[0, 0, 4, 4]}
            shadowColor="rgba(0,0,0,0.1)"
            shadowBlur={4}
            shadowOffsetY={2}
          />
        </>
      )}

      {shape === TableShapeEnum.BAR_STOOL && (
        <>
          <Circle
            x={width / 2}
            y={height / 2}
            radius={width / 2}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={strokeWidth + 0.5}
          />
          <Circle
            x={width / 2}
            y={height / 2}
            radius={width / 2 - 4}
            fill={baseFill}
            stroke={strokeColor}
            strokeWidth={0.5}
            listening={false}
          />
        </>
      )}

      {/* Table number text */}
      <Text
        x={0}
        y={shape === TableShapeEnum.ROUND ? height / 2 - fontSize / 2 - 2 : height / 2 - fontSize / 2 - 2}
        width={width}
        text={String(tableNum)}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#1f2937"
        align="center"
        listening={false}
      />

      {/* Seat count text (small, below table number) */}
      {shape !== TableShapeEnum.BAR_STOOL && (
        <Text
          x={0}
          y={shape === TableShapeEnum.ROUND ? height / 2 + fontSize / 2 - 4 : height / 2 + fontSize / 2 - 4}
          width={width}
          text={`${seats} seats`}
          fontSize={seatFontSize}
          fill="#6b7280"
          align="center"
          listening={false}
        />
      )}

      {/* Chair/seat indicators */}
      {chairPositions.map((pos, i) => (
        <Circle
          key={i}
          x={pos.x}
          y={pos.y}
          radius={chairRadius}
          fill="#d1d5db"
          stroke="#9ca3af"
          strokeWidth={0.5}
          listening={false}
        />
      ))}
    </Group>
  );
}
