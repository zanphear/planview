import { create } from 'zustand';
import { authApi, type User } from '../api/users';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ isAuthenticated: true });
    const me = await authApi.me();
    set({ user: me.data });
  },

  register: async (name, email, password, workspaceName) => {
    const { data } = await authApi.register({ name, email, password, workspace_name: workspaceName });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ isAuthenticated: true });
    const me = await authApi.me();
    set({ user: me.data });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
}));
