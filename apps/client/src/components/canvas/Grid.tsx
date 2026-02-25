import { useMemo } from 'react';
import { Line, Rect } from 'react-konva';
import { useUiStore } from '@/stores/uiStore';

interface GridProps {
  width: number;
  height: number;
  gridSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export function Grid({ width, height, gridSize, zoom, offsetX, offsetY }: GridProps) {
  const darkMode = useUiStore((s) => s.darkMode);

  const lines = useMemo(() => {
    // Don't render grid if too zoomed out (too many lines)
    if (gridSize * zoom < 5) return { minor: [], major: [] };

    const minor: { points: number[]; vertical: boolean }[] = [];
    const major: { points: number[]; vertical: boolean }[] = [];

    // Calculate visible area in canvas coordinates
    const viewLeft = -offsetX / zoom;
    const viewTop = -offsetY / zoom;
    const viewRight = viewLeft + width / zoom;
    const viewBottom = viewTop + height / zoom;

    // Add padding of a few grid units
    const pad = gridSize * 2;
    const startX = Math.floor((viewLeft - pad) / gridSize) * gridSize;
    const endX = Math.ceil((viewRight + pad) / gridSize) * gridSize;
    const startY = Math.floor((viewTop - pad) / gridSize) * gridSize;
    const endY = Math.ceil((viewBottom + pad) / gridSize) * gridSize;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const isMajor = x % (gridSize * 5) === 0;
      const entry = { points: [x, startY, x, endY], vertical: true };
      if (isMajor) {
        major.push(entry);
      } else {
        minor.push(entry);
      }
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const isMajor = y % (gridSize * 5) === 0;
      const entry = { points: [startX, y, endX, y], vertical: false };
      if (isMajor) {
        major.push(entry);
      } else {
        minor.push(entry);
      }
    }

    return { minor, major };
  }, [width, height, gridSize, zoom, offsetX, offsetY]);

  const bgFill = darkMode ? '#1f2937' : '#ffffff';
  const minorStroke = darkMode ? '#374151' : '#e5e7eb';
  const majorStroke = darkMode ? '#4b5563' : '#d1d5db';

  // Hide minor lines when zoomed out significantly
  const showMinor = gridSize * zoom >= 8;

  return (
    <>
      {/* Background fill */}
      <Rect
        x={-offsetX / zoom - 5000}
        y={-offsetY / zoom - 5000}
        width={width / zoom + 10000}
        height={height / zoom + 10000}
        fill={bgFill}
        listening={false}
      />

      {/* Minor grid lines */}
      {showMinor &&
        lines.minor.map((line, i) => (
          <Line
            key={`minor-${i}`}
            points={line.points}
            stroke={minorStroke}
            strokeWidth={0.5 / zoom}
            listening={false}
          />
        ))}

      {/* Major grid lines */}
      {lines.major.map((line, i) => (
        <Line
          key={`major-${i}`}
          points={line.points}
          stroke={majorStroke}
          strokeWidth={1 / zoom}
          listening={false}
        />
      ))}
    </>
  );
}
