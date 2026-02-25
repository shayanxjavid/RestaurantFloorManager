import { useRef, useState, useCallback, useEffect } from 'react';
import { Group, Text, Rect } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '@rfm/shared';
import { useCanvasStore } from '@/stores/canvasStore';

interface LabelShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  gridSnap: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function LabelShape({ element, isSelected, onSelect, gridSnap, stageRef }: LabelShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const [isEditing, setIsEditing] = useState(false);

  const text = element.text ?? 'Label';
  const fontSize = element.fontSize ?? 14;
  const fontColor = element.fontColor ?? '#1f2937';

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
      width: Math.max(20, element.width * scaleX),
      height: Math.max(10, element.height * scaleY),
      rotation: node.rotation(),
      fontSize: Math.max(8, Math.round(fontSize * scaleY)),
    });
  }, [element.id, element.width, element.height, fontSize, updateElement]);

  const handleDoubleClick = useCallback(() => {
    if (element.locked) return;
    setIsEditing(true);
  }, [element.locked]);

  // Create HTML overlay for editing
  useEffect(() => {
    if (!isEditing || !stageRef.current) return;

    const stage = stageRef.current;
    const container = stage.container();
    const stageBox = container.getBoundingClientRect();
    const zoom = useCanvasStore.getState().zoom;
    const offset = useCanvasStore.getState().offset;

    // Calculate screen position of the label
    const screenX = stageBox.left + element.x * zoom + offset.x;
    const screenY = stageBox.top + element.y * zoom + offset.y;

    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.left = `${screenX}px`;
    input.style.top = `${screenY}px`;
    input.style.width = `${Math.max(100, element.width * zoom)}px`;
    input.style.minHeight = `${Math.max(24, element.height * zoom)}px`;
    input.style.fontSize = `${fontSize * zoom}px`;
    input.style.fontFamily = 'sans-serif';
    input.style.color = fontColor;
    input.style.border = '2px solid #3b82f6';
    input.style.borderRadius = '4px';
    input.style.padding = '2px 4px';
    input.style.background = 'white';
    input.style.outline = 'none';
    input.style.resize = 'none';
    input.style.zIndex = '10000';
    input.style.transformOrigin = 'top left';
    input.style.transform = `rotate(${element.rotation}deg)`;
    input.style.lineHeight = '1.3';

    document.body.appendChild(input);
    input.focus();
    input.select();

    const finishEditing = () => {
      const newText = input.value;
      updateElement(element.id, { text: newText });
      setIsEditing(false);
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishEditing();
      }
    });

    return () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
  }, [isEditing, element.id, element.x, element.y, element.width, element.height, element.rotation, text, fontSize, fontColor, stageRef, updateElement]);

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
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Selection highlight background */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={element.width + 4}
          height={element.height + 4}
          stroke="#3b82f6"
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      )}

      {/* Text content */}
      {!isEditing && (
        <Text
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          text={text}
          fontSize={fontSize}
          fill={fontColor}
          fontFamily="sans-serif"
          verticalAlign="middle"
        />
      )}
    </Group>
  );
}
