import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Inyectar token JWT en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { api };

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { username, password });
          set({ user: data.user, token: data.token, isLoading: false });
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || 'Error al iniciar sesión';
          set({ error: msg, isLoading: false });
          return { ok: false, error: msg };
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
        } catch {
          get().logout();
        }
      },

      updateTokens: (newTokens) => {
        set((state) => ({
          user: state.user ? { ...state.user, tokens: newTokens } : null,
        }));
      },
    }),
    {
      name: 'megabet-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
