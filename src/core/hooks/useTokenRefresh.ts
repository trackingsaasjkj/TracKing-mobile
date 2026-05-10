import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/core/api/apiClient';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Automatically refreshes the authentication token every 10 minutes
 * to prevent session expiration during inactivity.
 *
 * The backend token TTL is ~15 minutes, so we refresh at 10 minutes
 * to ensure the token is always valid before it expires.
 *
 * IMPORTANT: This runs continuously in BOTH foreground and background
 * because the app is for couriers who may have their phone locked/in pocket
 * while actively delivering. The token must stay valid even when the app
 * is not visible.
 */
export function useTokenRefresh(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshToken = useCallback(async () => {
    if (!accessToken) return;

    try {
      await apiClient.post('/api/auth/refresh');
      // Token refreshed successfully — the new token is in the httpOnly cookie
      // and will be used by subsequent requests via the request interceptor
      console.log('[TokenRefresh] Token refreshed successfully');
    } catch (error) {
      // If refresh fails, the response interceptor will handle the 401
      // and clear the session if necessary
      console.error('[TokenRefresh] Failed to refresh token:', error);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Refresh every 10 minutes (600,000 ms) continuously in foreground AND background
    // This ensures the token stays valid even when the phone is locked/in pocket
    intervalRef.current = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000); // 10 minutes

    // Refresh immediately on mount to ensure token is fresh
    refreshToken();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accessToken, refreshToken]);
}
