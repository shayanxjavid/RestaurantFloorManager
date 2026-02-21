import { api } from './client';
import type {
  LoginInput,
  RegisterInput,
  AuthResponse,
  User,
  Restaurant,
  Floor,
  Layout,
  CreateLayoutInput,
  UpdateLayoutInput,
  CreateRestaurantInput,
  TableConfig,
  CreateTableConfigInput,
  UpdateTableStatusInput,
  TableStatusEntry,
  Section,
  CreateSectionInput,
  Shift,
  CreateShiftInput,
  AssignServerInput,
  ShiftAssignment,
} from '@rfm/shared';
import { type AssignmentStatus, type UserRole } from '@rfm/shared';

// ==================== Auth ====================

export const authApi = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const res = await api.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

// ==================== Restaurants ====================

export const restaurantApi = {
  async create(data: CreateRestaurantInput): Promise<Restaurant> {
    const res = await api.post<Restaurant>('/restaurants', data);
    return res.data;
  },

  async list(): Promise<Restaurant[]> {
    const res = await api.get<Restaurant[]>('/restaurants');
    return res.data;
  },

  async get(id: string): Promise<Restaurant & { floors: Floor[] }> {
    const res = await api.get<Restaurant & { floors: Floor[] }>(`/restaurants/${id}`);
    return res.data;
  },
};

// ==================== Layouts ====================

export const layoutApi = {
  async getByFloor(floorId: string): Promise<Layout[]> {
    const res = await api.get<Layout[]>(`/layouts/floor/${floorId}`);
    return res.data;
  },

  async get(id: string): Promise<Layout> {
    const res = await api.get<Layout>(`/layouts/${id}`);
    return res.data;
  },

  async create(data: CreateLayoutInput): Promise<Layout> {
    const res = await api.post<Layout>('/layouts', data);
    return res.data;
  },

  async update(id: string, data: UpdateLayoutInput): Promise<Layout> {
    const res = await api.put<Layout>(`/layouts/${id}`, data);
    return res.data;
  },

  async activate(id: string): Promise<Layout> {
    const res = await api.post<Layout>(`/layouts/${id}/activate`);
    return res.data;
  },

  async duplicate(id: string): Promise<Layout> {
    const res = await api.post<Layout>(`/layouts/${id}/duplicate`);
    return res.data;
  },
};

// ==================== Tables ====================

export const tableApi = {
  async getByLayout(layoutId: string): Promise<TableConfig[]> {
    const res = await api.get<TableConfig[]>(`/tables/layout/${layoutId}`);
    return res.data;
  },

  async create(data: CreateTableConfigInput): Promise<TableConfig> {
    const res = await api.post<TableConfig>('/tables', data);
    return res.data;
  },

  async update(id: string, data: Partial<CreateTableConfigInput>): Promise<TableConfig> {
    const res = await api.put<TableConfig>(`/tables/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tables/${id}`);
  },

  async updateStatus(id: string, data: UpdateTableStatusInput): Promise<TableStatusEntry> {
    const res = await api.put<TableStatusEntry>(`/tables/${id}/status`, data);
    return res.data;
  },

  async getHistory(id: string): Promise<TableStatusEntry[]> {
    const res = await api.get<TableStatusEntry[]>(`/tables/${id}/history`);
    return res.data;
  },
};

// ==================== Sections ====================

export const sectionApi = {
  async getByLayout(layoutId: string): Promise<Section[]> {
    const res = await api.get<Section[]>(`/sections/layout/${layoutId}`);
    return res.data;
  },

  async create(data: CreateSectionInput): Promise<Section> {
    const res = await api.post<Section>('/sections', data);
    return res.data;
  },

  async update(id: string, data: Partial<CreateSectionInput>): Promise<Section> {
    const res = await api.put<Section>(`/sections/${id}`, data);
    return res.data;
  },

  async assignTables(id: string, tableIds: string[]): Promise<Section> {
    const res = await api.put<Section>(`/sections/${id}/tables`, { tableIds });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sections/${id}`);
  },
};

// ==================== Shifts ====================

export const shiftApi = {
  async getByDate(date: string): Promise<Shift[]> {
    const res = await api.get<Shift[]>(`/shifts?date=${date}`);
    return res.data;
  },

  async create(data: CreateShiftInput): Promise<Shift> {
    const res = await api.post<Shift>('/shifts', data);
    return res.data;
  },

  async assignServer(shiftId: string, data: AssignServerInput): Promise<ShiftAssignment> {
    const res = await api.post<ShiftAssignment>(`/shifts/${shiftId}/assign`, data);
    return res.data;
  },

  async claimSection(shiftId: string): Promise<ShiftAssignment> {
    const res = await api.post<ShiftAssignment>(`/shifts/${shiftId}/claim`);
    return res.data;
  },

  async updateAssignment(assignmentId: string, status: AssignmentStatus): Promise<ShiftAssignment> {
    const res = await api.put<ShiftAssignment>(`/shifts/assignments/${assignmentId}`, { status });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/shifts/${id}`);
  },
};

// ==================== Analytics ====================

export interface TurnoverData {
  tableId: string;
  tableNumber: number;
  turnoverCount: number;
  avgDuration: number;
}

export interface SectionAnalytics {
  sectionId: string;
  sectionName: string;
  totalCovers: number;
  avgTurnover: number;
}

export interface StaffAnalytics {
  userId: string;
  userName: string;
  tablesServed: number;
  avgRating: number;
}

export interface OverviewData {
  totalTables: number;
  occupiedTables: number;
  totalGuests: number;
  avgTurnover: number;
}

export const analyticsApi = {
  async getTurnover(): Promise<TurnoverData[]> {
    const res = await api.get<TurnoverData[]>('/analytics/turnover');
    return res.data;
  },

  async getSections(): Promise<SectionAnalytics[]> {
    const res = await api.get<SectionAnalytics[]>('/analytics/sections');
    return res.data;
  },

  async getStaff(date?: string): Promise<StaffAnalytics[]> {
    const url = date ? `/analytics/staff?date=${date}` : '/analytics/staff';
    const res = await api.get<StaffAnalytics[]>(url);
    return res.data;
  },

  async getOverview(): Promise<OverviewData> {
    const res = await api.get<OverviewData>('/analytics/overview');
    return res.data;
  },
};

// ==================== Users ====================

export const userApi = {
  async list(): Promise<User[]> {
    const res = await api.get<User[]>('/users');
    return res.data;
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    const res = await api.put<User>(`/users/${id}/role`, { role });
    return res.data;
  },

  async deactivate(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
