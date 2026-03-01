import { Group, Rect, Text } from 'react-konva';
import type { Section, TableConfig } from '@rfm/shared';

interface SectionOverlayProps {
  sections: Section[];
  tables: TableConfig[];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface SectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeSectionBounds(sectionTables: TableConfig[]): SectionBounds | null {
  if (sectionTables.length === 0) return null;

  const padding = 20;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const table of sectionTables) {
    minX = Math.min(minX, table.x);
    minY = Math.min(minY, table.y);
    maxX = Math.max(maxX, table.x + table.width);
    maxY = Math.max(maxY, table.y + table.height);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

function SectionGroup({
  section,
  tables,
}: {
  section: Section;
  tables: TableConfig[];
}) {
  const sectionTableIds = new Set(section.tables?.map((t) => t.id) ?? []);
  const sectionTables = tables.filter((t) => sectionTableIds.has(t.id));
  const bounds = computeSectionBounds(sectionTables);

  if (!bounds) return null;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return (
    <Group>
      {/* Semi-transparent background rectangle */}
      <Rect
        x={bounds.minX}
        y={bounds.minY}
        width={width}
        height={height}
        fill={hexToRgba(section.color, 0.12)}
        stroke={hexToRgba(section.color, 0.4)}
        strokeWidth={2}
        cornerRadius={8}
        dash={[6, 4]}
      />

      {/* Section name label */}
      <Text
        x={bounds.minX + 6}
        y={bounds.minY + 4}
        text={section.name}
        fontSize={12}
        fontStyle="bold"
        fill={section.color}
        opacity={0.9}
      />
    </Group>
  );
}

export function SectionOverlay({ sections, tables }: SectionOverlayProps) {
  return (
    <Group listening={false}>
      {sections.map((section) => (
        <SectionGroup
          key={section.id}
          section={section}
          tables={tables}
        />
      ))}
    </Group>
  );
}
