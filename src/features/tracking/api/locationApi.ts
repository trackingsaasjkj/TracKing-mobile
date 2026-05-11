import axios from 'axios';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAuthStore } from '@/features/auth/store/authStore';

const BASE_URL = (apiClient.defaults.baseURL as string) ?? '';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  /** Precision in meters — omit if unknown (do NOT send 0) */
  accuracy?: number;
}

/**
 * Intenta refrescar el token en background.
 * Esto es crítico para que el tracking continúe después de que el access token expire.
 */
async function refreshTokenInBackground(): Promise<string | null> {
  try {
    const refreshToken = await secureStorage.getRefreshToken();
    
    if (!refreshToken) {
      console.error('[LocationAPI] No refresh token available');
      return null;
    }

    if (!BASE_URL) {
      console.error('[LocationAPI] BASE_URL is not configured');
      return null;
    }

    console.log('[LocationAPI] Attempting to refresh token in background');

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('[LocationAPI] Refresh failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data?.data?.accessToken;
    const newRefreshToken = data?.data?.refreshToken;

    if (!newAccessToken || !newRefreshToken) {
      console.error('[LocationAPI] Refresh response missing tokens');
      return null;
    }

    // Guardar los nuevos tokens en secure storage
    await Promise.all([
      secureStorage.setAccessToken(newAccessToken),
      secureStorage.setRefreshToken(newRefreshToken),
    ]);

    // Actualizar el store en memoria (si está disponible)
    const authStore = useAuthStore.getState();
    if (authStore.user) {
      authStore.setSession(authStore.user, newAccessToken, newRefreshToken);
    }

    console.log('[LocationAPI] Token refreshed successfully in background');
    return newAccessToken;
  } catch (error) {
    console.error('[LocationAPI] Error refreshing token in background:', error);
    return null;
  }
}

export const locationApi = {
  /** Foreground: uses apiClient (token from Zustand store + interceptors) */
  send: (payload: LocationPayload): Promise<unknown> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/location', payload)
      .then(unwrap),

  /**
   * Background: reads token from Zustand first, then falls back to SecureStore.
   * Si recibe 401, intenta refrescar el token automáticamente.
   *
   * Why Zustand first?
   * - Token is available immediately after login (in memory)
   * - If app closes quickly, token is still in Zustand memory
   * - Avoids race condition where secureStorage.setAccessToken() hasn't finished yet
   *
   * Why SecureStore fallback?
   * - When app restarts, Zustand is empty but SecureStore has the token
   * - Ensures background task works even after force-close
   *
   * Usamos fetch en lugar de axios porque XMLHttpRequest (que usa axios)
   * puede ser inestable en contextos Headless JS (segundo plano) en Android.
   */
  sendFromBackground: async (payload: LocationPayload): Promise<void> => {
    // Try Zustand first (token in memory)
    let token = useAuthStore.getState().accessToken;

    // Fallback to SecureStore (token persisted to disk)
    if (!token) {
      token = await secureStorage.getAccessToken();
    }

    if (!token) {
      console.error('[LocationAPI] No token available in Zustand or SecureStore');
      return;
    }

    if (!BASE_URL) {
      console.error('[LocationAPI] BASE_URL is not configured');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/courier/location`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Si recibe 401, intentar refrescar el token
        if (response.status === 401) {
          console.warn('[LocationAPI] Received 401, attempting to refresh token');
          const newToken = await refreshTokenInBackground();
          
          if (newToken) {
            // Reintentar enviar la ubicación con el nuevo token
            console.log('[LocationAPI] Retrying location send with new token');
            const retryResponse = await fetch(`${BASE_URL}/api/courier/location`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (!retryResponse.ok) {
              const error = new Error(`Location send failed with status ${retryResponse.status}`);
              (error as any).status = retryResponse.status;
              throw error;
            }
            console.log('[LocationAPI] Location sent successfully after token refresh');
            return;
          } else {
            // No se pudo refrescar el token, la sesión expiró
            const error = new Error('Unauthorized');
            (error as any).status = 401;
            throw error;
          }
        }

        // Otros errores (400, 500, etc.)
        const error = new Error(`Location send failed with status ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }
    } catch (error) {
      console.error('[LocationAPI] Error sending background location:', error);
      throw error;
    }
  },
};
