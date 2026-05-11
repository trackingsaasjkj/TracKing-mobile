import { create } from 'zustand';
import { secureStorage } from '@/core/storage/secureStorage';
import type { AuthState, CourierUser, OperationalStatus } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setSession: async (user: CourierUser, token: string, refreshToken?: string) => {
    // Persist tokens to secure storage — WAIT for completion
    console.log('[AuthStore] setSession called with:', {
      hasUser: !!user,
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      tokenLength: token?.length ?? 0,
      refreshTokenLength: refreshToken?.length ?? 0
    });
    
    // Save tokens to secure storage and wait for completion
    const savePromises: Promise<void>[] = [];
    
    if (token) {
      console.log('[AuthStore] Saving accessToken to secureStorage');
      savePromises.push(secureStorage.setAccessToken(token));
    }
    if (refreshToken) {
      console.log('[AuthStore] Saving refreshToken to secureStorage');
      savePromises.push(secureStorage.setRefreshToken(refreshToken));
    } else {
      console.log('[AuthStore] No refreshToken to save');
    }
    
    // Wait for all storage operations to complete
    if (savePromises.length > 0) {
      await Promise.all(savePromises);
      console.log('[AuthStore] All tokens saved to secureStorage');
    }
    
    // Store tokens in memory for immediate access
    set({ user, accessToken: token, refreshToken: refreshToken ?? null, isAuthenticated: true });
  },

  clearSession: async () => {
    console.log('[AuthStore] clearSession called');
    await secureStorage.clearAllTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setOperationalStatus: (status: OperationalStatus) => {
    set((state) => ({
      user: state.user ? { ...state.user, operationalStatus: status } : null,
    }));
  },
}));
