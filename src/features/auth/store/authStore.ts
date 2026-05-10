import { create } from 'zustand';
import { secureStorage } from '@/core/storage/secureStorage';
import type { AuthState, CourierUser, OperationalStatus } from '../types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setSession: (user: CourierUser, token: string, refreshToken?: string) => {
    // Persist tokens to secure storage — fire and forget
    console.log('[AuthStore] setSession called with:', {
      hasUser: !!user,
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      tokenLength: token?.length ?? 0,
      refreshTokenLength: refreshToken?.length ?? 0
    });
    
    if (token) {
      console.log('[AuthStore] Saving accessToken to secureStorage');
      secureStorage.setAccessToken(token);
    }
    if (refreshToken) {
      console.log('[AuthStore] Saving refreshToken to secureStorage');
      secureStorage.setRefreshToken(refreshToken);
    } else {
      console.log('[AuthStore] No refreshToken to save');
    }
    
    // Store tokens in memory for immediate access
    set({ user, accessToken: token, refreshToken: refreshToken ?? null, isAuthenticated: true });
  },

  clearSession: () => {
    console.log('[AuthStore] clearSession called');
    secureStorage.clearAllTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setOperationalStatus: (status: OperationalStatus) => {
    set((state) => ({
      user: state.user ? { ...state.user, operationalStatus: status } : null,
    }));
  },
}));
