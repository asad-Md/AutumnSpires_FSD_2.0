import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '@/lib/storage';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      
      setLoading: (value) => set({ isLoading: value }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      login: async (email, otp) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, type: 'login' }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }
          
          set({ isAuthenticated: true, isLoading: false });
          return data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      signup: async (email, otp, username) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, type: 'signup', username }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
          }
          
          set({ isAuthenticated: true, isLoading: false });
          return data;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        set({ isAuthenticated: false, error: null });
      },
      
      checkAuth: () => {
        const { isAuthenticated } = get();
        return isAuthenticated;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);
