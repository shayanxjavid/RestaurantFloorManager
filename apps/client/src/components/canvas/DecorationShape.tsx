import { useRef, useCallback } from 'react';
import { Group, Rect, Circle, Text, Arc, Line } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '@rfm/shared';
import { DecorationType } from '@rfm/shared';
import { useCanvasStore } from '@/stores/canvasStore';

interface DecorationShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  gridSnap: boolean;
}

export function DecorationShape({ element, isSelected, onSelect, gridSnap }: DecorationShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);

  const decoType = element.decorationType ?? DecorationType.PILLAR;
  const { width, height } = element;

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
      width: Math.max(10, element.width * scaleX),
      height: Math.max(10, element.height * scaleY),
      rotation: node.rotation(),
    });
  }, [element.id, element.width, element.height, updateElement]);

  const strokeColor = isSelected ? '#3b82f6' : '#9ca3af';
  const strokeW = isSelected ? 2 : 1;

  const renderDecoration = () => {
    switch (decoType) {
      case DecorationType.BAR_COUNTER:
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={element.fill ?? '#8B7355'}
              stroke={strokeColor}
              strokeWidth={strokeW}
              cornerRadius={height / 3}
              shadowColor="rgba(0,0,0,0.15)"
              shadowBlur={4}
              shadowOffsetY={2}
            />
            {/* Wood grain lines */}
            <Line
              points={[width * 0.1, height * 0.3, width * 0.9, height * 0.3]}
              stroke="#a08060"
              strokeWidth={0.5}
              opacity={0.5}
              listening={false}
            />
            <Line
              points={[width * 0.05, height * 0.6, width * 0.95, height * 0.6]}
              stroke="#a08060"
              strokeWidth={0.5}
              opacity={0.5}
              listening={false}
            />
            <Text
              x={0}
              y={height / 2 - 5}
              width={width}
              text="BAR"
              fontSize={Math.min(12, height * 0.35)}
              fontStyle="bold"
              fill="#ffffff"
              align="center"
              opacity={0.7}
              listening={false}
            />
          </>
        );

      case DecorationType.KITCHEN:
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={element.fill ?? '#d1d5db'}
              stroke={strokeColor}
              strokeWidth={strokeW}
              dash={[6, 3]}
            />
            <Text
              x={0}
              y={height / 2 - 7}
              width={width}
              text="KITCHEN"
              fontSize={Math.min(14, width * 0.14, height * 0.3)}
              fontStyle="bold"
              fill="#4b5563"
              align="center"
              listening={false}
            />
          </>
        );

      case DecorationType.ENTRANCE:
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={element.fill ?? '#dcfce7'}
              stroke={strokeColor}
              strokeWidth={strokeW}
              cornerRadius={2}
            />
            {/* Door arc */}
            <Arc
              x={width * 0.2}
              y={height}
              innerRadius={0}
              outerRadius={Math.min(width * 0.3, height * 0.6)}
              angle={90}
              rotation={-90}
              fill="#86efac"
              opacity={0.5}
              listening={false}
            />
            <Text
              x={0}
              y={height * 0.15}
              width={width}
              text="ENTRANCE"
              fontSize={Math.min(11, width * 0.12, height * 0.25)}
              fontStyle="bold"
              fill="#166534"
              align="center"
              listening={false}
            />
          </>
        );

      case DecorationType.RESTROOM:
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={element.fill ?? '#dbeafe'}
              stroke={strokeColor}
              strokeWidth={strokeW}
              cornerRadius={2}
            />
            <Text
              x={0}
              y={height / 2 - 10}
              width={width}
              text="WC"
              fontSize={Math.min(18, width * 0.35, height * 0.4)}
              fontStyle="bold"
              fill="#1e40af"
              align="center"
              listening={false}
            />
          </>
        );

      case DecorationType.PLANT:
        return (
          <>
            <Circle
              x={width / 2}
              y={height / 2}
              radius={Math.min(width, height) / 2}
              fill={element.fill ?? '#86efac'}
              stroke={strokeColor}
              strokeWidth={strokeW}
            />
            {/* Leaf pattern - simple lines from center */}
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const r = Math.min(width, height) / 2 - 3;
              return (
                <Line
                  key={angle}
                  points={[
                    width / 2,
                    height / 2,
                    width / 2 + r * 0.7 * Math.cos(rad),
                    height / 2 + r * 0.7 * Math.sin(rad),
                  ]}
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  lineCap="round"
                  listening={false}
                />
              );
            })}
            <Circle
              x={width / 2}
              y={height / 2}
              radius={Math.min(width, height) * 0.15}
              fill="#4ade80"
              listening={false}
            />
          </>
        );

      case DecorationType.PILLAR:
        return (
          <>
            {width === height ? (
              <Circle
                x={width / 2}
                y={height / 2}
                radius={width / 2}
                fill={element.fill ?? '#374151'}
                stroke={strokeColor}
                strokeWidth={strokeW}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={4}
                shadowOffsetY={2}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={element.fill ?? '#374151'}
                stroke={strokeColor}
                strokeWidth={strokeW}
                cornerRadius={2}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={4}
                shadowOffsetY={2}
              />
            )}
          </>
        );

      default:
        return (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#e5e7eb"
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
        );
    }
  };

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
      {renderDecoration()}
    </Group>
  );
}
