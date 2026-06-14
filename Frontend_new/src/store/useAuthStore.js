import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login, register, logout, getCurrentUser, getStoredUser, isAuthenticated } from '../services/api.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await login(credentials);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            loading: false,
            error: null
          });
          // Clear any cached data and initialize fresh from backend
          const { resetSanctuaryStore, useSanctuaryStore } = await import('./useSanctuaryStore.js');
          resetSanctuaryStore();
          // Initialize user state from backend
          setTimeout(() => {
            useSanctuaryStore.getState().initializeFromBackend();
          }, 100);
          return response;
        } catch (error) {
          set({ 
            error: error.message, 
            loading: false,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ loading: true, error: null });
        try {
          const response = await register(userData);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            loading: false,
            error: null
          });
          // New user — completely reset sanctuary store and initialize fresh
          const { resetSanctuaryStore, useSanctuaryStore } = await import('./useSanctuaryStore.js');
          resetSanctuaryStore();
          // Initialize from backend to ensure we get fresh user data
          setTimeout(() => {
            useSanctuaryStore.getState().initializeFromBackend();
          }, 100);
          return response;
        } catch (error) {
          set({ 
            error: error.message, 
            loading: false,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      logout: () => {
        logout();
        // Lazy import to avoid circular dependency
        import('./useSanctuaryStore.js').then(({ resetSanctuaryStore }) => resetSanctuaryStore());
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        });
      },

      checkAuth: async () => {
        const storedUser = getStoredUser();
        if (storedUser && isAuthenticated()) {
          set({ 
            user: storedUser, 
            isAuthenticated: true 
          });
          
          // Verify token is still valid
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              set({ user: currentUser });
            }
          } catch (error) {
            // Token expired, logout
            get().logout();
          }
        } else {
          set({ 
            user: null, 
            isAuthenticated: false 
          });
        }
      },

      clearError: () => set({ error: null }),

      // Get current user ID for API calls
      getUserId: () => {
        const { user } = get();
        return user?.id || 1; // fallback to 1 for backward compatibility
      },
    }),
    {
      name: 'healthquest-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
