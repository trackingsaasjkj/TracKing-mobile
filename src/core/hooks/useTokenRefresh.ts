import { useEffect, useRef, useCallback } from 'react';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
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
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshToken = useCallback(async () => {
    if (!accessToken || !user) return;

    try {
      // Capturar la respuesta del refresh endpoint
      const res = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
        '/api/auth/refresh'
      );
      
      // Extraer los nuevos tokens de la respuesta
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = unwrap(res);
      
      // Guardar los nuevos tokens en el store y secure storage
      // IMPORTANTE: Esperar a que se complete
      await setSession(user, newAccessToken, newRefreshToken);
      
      console.log('[TokenRefresh] Token refreshed successfully and saved to store');
    } catch (error) {
      // If refresh fails, the response interceptor will handle the 401
      // and clear the session if necessary
      console.error('[TokenRefresh] Failed to refresh token:', error);
    }
  }, [accessToken, user, setSession]);

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

    // DO NOT refresh immediately on mount — the token is fresh from login
    // Only start the interval, which will refresh after 10 minutes
    console.log('[TokenRefresh] Token refresh interval started (will refresh in 10 minutes)');

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accessToken, refreshToken]);
}
