import { create } from 'zustand';
import { authApi, type AuthResponse } from '@/shared/api';

interface User {
  id: number;
  email: string;
  name: string;
  last_name?: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  timezone?: string;
  avatar_url?: string;
  status: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
  handleAuthResponse: (data: AuthResponse) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (token, user) =>
    set({ accessToken: token, user, isAuthenticated: true, isLoading: false }),

  setAccessToken: (token) => set({ accessToken: token }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  handleAuthResponse: (data) =>
    set({
      accessToken: data.access_token,
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    }),

  initialize: async () => {
    try {
      // Refresh token
      const authData = await authApi.refresh();

      // Set token immediately so getMe() can use it
      set({ accessToken: authData.access_token });

      // Fetch full profile data (now with token in store)
      const profileData = await authApi.getMe();

      set({
        accessToken: authData.access_token,
        user: profileData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
