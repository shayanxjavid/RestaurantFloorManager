export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SERVER = 'SERVER',
}

export enum TableShape {
  ROUND = 'ROUND',
  SQUARE = 'SQUARE',
  RECTANGLE = 'RECTANGLE',
  BOOTH = 'BOOTH',
  BAR_STOOL = 'BAR_STOOL',
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SEATED = 'SEATED',
  ORDERING = 'ORDERING',
  SERVED = 'SERVED',
  CHECK_REQUESTED = 'CHECK_REQUESTED',
  CLEANING = 'CLEANING',
}

export enum ElementType {
  TABLE = 'TABLE',
  WALL = 'WALL',
  LABEL = 'LABEL',
  DECORATION = 'DECORATION',
}

export enum DecorationType {
  BAR_COUNTER = 'BAR_COUNTER',
  KITCHEN = 'KITCHEN',
  ENTRANCE = 'ENTRANCE',
  RESTROOM = 'RESTROOM',
  PLANT = 'PLANT',
  PILLAR = 'PILLAR',
}

export enum ShiftType {
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  LATE_NIGHT = 'LATE_NIGHT',
  CUSTOM = 'CUSTOM',
}

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  CLAIMED = 'CLAIMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: '#22c55e',
  [TableStatus.RESERVED]: '#a855f7',
  [TableStatus.SEATED]: '#3b82f6',
  [TableStatus.ORDERING]: '#f59e0b',
  [TableStatus.SERVED]: '#06b6d4',
  [TableStatus.CHECK_REQUESTED]: '#ef4444',
  [TableStatus.CLEANING]: '#6b7280',
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: 'Available',
  [TableStatus.RESERVED]: 'Reserved',
  [TableStatus.SEATED]: 'Seated',
  [TableStatus.ORDERING]: 'Ordering',
  [TableStatus.SERVED]: 'Served',
  [TableStatus.CHECK_REQUESTED]: 'Check',
  [TableStatus.CLEANING]: 'Cleaning',
};

export const SECTION_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#a855f7', '#06b6d4', '#f97316', '#ec4899',
  '#14b8a6', '#8b5cf6', '#84cc16', '#e11d48',
];

export const DEFAULT_TABLE_SEATS: Record<TableShape, number> = {
  [TableShape.ROUND]: 4,
  [TableShape.SQUARE]: 4,
  [TableShape.RECTANGLE]: 6,
  [TableShape.BOOTH]: 4,
  [TableShape.BAR_STOOL]: 1,
};

export const DEFAULT_TABLE_DIMENSIONS: Record<TableShape, { width: number; height: number }> = {
  [TableShape.ROUND]: { width: 60, height: 60 },
  [TableShape.SQUARE]: { width: 60, height: 60 },
  [TableShape.RECTANGLE]: { width: 100, height: 60 },
  [TableShape.BOOTH]: { width: 120, height: 60 },
  [TableShape.BAR_STOOL]: { width: 30, height: 30 },
};

export const LAYER_ORDER = ['background', 'walls', 'decorations', 'tables', 'labels', 'sections'] as const;
export type LayerName = typeof LAYER_ORDER[number];
