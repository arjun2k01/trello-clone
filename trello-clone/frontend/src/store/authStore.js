import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  login: async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    set({ user: data.data.user, token: data.data.token });
    return data;
  },

  register: async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    set({ user: data.data.user, token: data.data.token });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }

    try {
      const { data } = await authAPI.getMe();
      set({ user: data.data, loading: false });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, loading: false });
    }
  },

  setUser: (user) => set({ user }),
}));

// Check auth on app load
useAuthStore.getState().checkAuth();