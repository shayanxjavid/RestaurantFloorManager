import { create } from 'zustand';
import type { User, LoginInput, RegisterInput } from '@rfm/shared';
import { authApi } from '@/api';
import { setTokens, clearTokens, getAccessToken } from '@/api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (data) => {
    const response = await authApi.login(data);
    setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (data) => {
    const response = await authApi.register(data);
    setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearTokens();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
