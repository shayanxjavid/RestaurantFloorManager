import { z } from 'zod';
import {
  UserRole, TableShape, TableStatus, ElementType,
  DecorationType, AssignmentStatus, ReservationStatus,
} from '../constants';

// ==================== AUTH ====================
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.SERVER),
});

// ==================== USER ====================
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(UserRole),
  avatar: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().or(z.date()),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

// ==================== CANVAS ELEMENTS ====================
export const canvasElementSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ElementType),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  layer: z.string().default('tables'),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  // Table-specific
  tableNumber: z.number().optional(),
  tableShape: z.nativeEnum(TableShape).optional(),
  seats: z.number().optional(),
  // Wall-specific
  strokeWidth: z.number().optional(),
  strokeColor: z.string().optional(),
  // Label-specific
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  // Decoration-specific
  decorationType: z.nativeEnum(DecorationType).optional(),
  // Styling
  fill: z.string().optional(),
  opacity: z.number().min(0).max(1).default(1),
});

// ==================== LAYOUT ====================
export const createLayoutSchema = z.object({
  name: z.string().min(1, 'Layout name is required'),
  floorId: z.string().uuid(),
  elements: z.array(canvasElementSchema).default([]),
  gridSize: z.number().min(5).max(100).default(20),
  width: z.number().min(400).default(1200),
  height: z.number().min(300).default(800),
});

export const updateLayoutSchema = z.object({
  name: z.string().min(1).optional(),
  elements: z.array(canvasElementSchema).optional(),
  gridSize: z.number().min(5).max(100).optional(),
  width: z.number().min(400).optional(),
  height: z.number().min(300).optional(),
});

// ==================== FLOOR ====================
export const createFloorSchema = z.object({
  name: z.string().min(1, 'Floor name is required'),
  level: z.number().int(),
  restaurantId: z.string().uuid(),
});

// ==================== RESTAURANT ====================
export const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  address: z.string().optional(),
  timezone: z.string().default('America/New_York'),
});

// ==================== SECTION ====================
export const createSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  layoutId: z.string().uuid(),
  floorId: z.string().uuid(),
});

export const assignTablesSchema = z.object({
  tableIds: z.array(z.string().uuid()),
});

// ==================== TABLE STATUS ====================
export const updateTableStatusSchema = z.object({
  status: z.nativeEnum(TableStatus),
  guestCount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  serverName: z.string().optional(),
});

// ==================== TABLE CONFIG ====================
export const createTableConfigSchema = z.object({
  layoutId: z.string().uuid(),
  tableNumber: z.number().int().positive(),
  elementId: z.string(),
  seats: z.number().int().positive(),
  shape: z.nativeEnum(TableShape),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
});

// ==================== SHIFT ====================
export const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  startTime: z.string(),
  endTime: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  floorId: z.string().uuid(),
});

export const assignServerSchema = z.object({
  userId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

// ==================== RESERVATION ====================
export const createReservationSchema = z.object({
  tableId: z.string().uuid(),
  guestName: z.string().min(1),
  partySize: z.number().int().positive(),
  dateTime: z.string(),
  duration: z.number().int().positive().default(90),
  notes: z.string().optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
});
