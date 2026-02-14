import { z } from 'zod';
import {
  loginSchema, registerSchema, userSchema, canvasElementSchema,
  createLayoutSchema, updateLayoutSchema, createFloorSchema,
  createRestaurantSchema, createSectionSchema, assignTablesSchema,
  updateTableStatusSchema, createTableConfigSchema, createShiftSchema,
  assignServerSchema, createReservationSchema, updateReservationStatusSchema,
  updateUserRoleSchema,
} from '../schemas';
import {
  UserRole, TableShape, TableStatus, ElementType,
  DecorationType, AssignmentStatus, ReservationStatus,
  LayerName,
} from '../constants';

// Auth types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// User types
export type User = z.infer<typeof userSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Canvas types
export type CanvasElement = z.infer<typeof canvasElementSchema>;
export type CreateLayoutInput = z.infer<typeof createLayoutSchema>;
export type UpdateLayoutInput = z.infer<typeof updateLayoutSchema>;

// Floor types
export type CreateFloorInput = z.infer<typeof createFloorSchema>;

// Restaurant types
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

// Section types
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type AssignTablesInput = z.infer<typeof assignTablesSchema>;

// Table types
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
export type CreateTableConfigInput = z.infer<typeof createTableConfigSchema>;

// Shift types
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type AssignServerInput = z.infer<typeof assignServerSchema>;

// Reservation types
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;

// Full entity types (from DB)
export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  ownerId: string;
  createdAt: Date;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  restaurantId: string;
}

export interface Layout {
  id: string;
  name: string;
  floorId: string;
  elements: CanvasElement[];
  gridSize: number;
  width: number;
  height: number;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableConfig {
  id: string;
  layoutId: string;
  tableNumber: number;
  elementId: string;
  seats: number;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface Section {
  id: string;
  name: string;
  color: string;
  layoutId: string;
  floorId: string;
  tables?: TableConfig[];
}

export interface Shift {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  date: Date;
  floorId: string;
  createdBy: string;
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  userId: string;
  sectionId: string;
  claimedAt: Date | null;
  status: AssignmentStatus;
  user?: User;
  section?: Section;
}

export interface TableStatusEntry {
  id: string;
  tableId: string;
  shiftId: string | null;
  status: TableStatus;
  guestCount: number;
  notes: string | null;
  serverName: string | null;
  seatedAt: Date | null;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  tableId: string;
  guestName: string;
  partySize: number;
  dateTime: Date;
  duration: number;
  notes: string | null;
  status: ReservationStatus;
  createdAt: Date;
}

// Auth response types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Socket event types
export interface TableStatusUpdate {
  tableId: string;
  status: TableStatus;
  guestCount?: number;
  notes?: string;
  serverName?: string;
  updatedBy: string;
}

export interface SectionClaimEvent {
  shiftId: string;
  sectionId: string;
  userId: string;
  userName: string;
}

export interface LayoutUpdateEvent {
  layoutId: string;
  elements: CanvasElement[];
  updatedBy: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  role: UserRole;
  online: boolean;
}

// Re-export enums and constants
export {
  UserRole, TableShape, TableStatus, ElementType,
  DecorationType, AssignmentStatus, ReservationStatus,
};
export type { LayerName };
