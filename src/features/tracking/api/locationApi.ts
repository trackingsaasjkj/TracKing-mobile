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

export const locationApi = {
  /** Foreground: uses apiClient (token from Zustand store + interceptors) */
  send: (payload: LocationPayload): Promise<unknown> =>
    apiClient
      .post<ApiResponse<unknown>>('/api/courier/location', payload)
      .then(unwrap),

  /**
   * Background: reads token from Zustand first, then falls back to SecureStore.
   *
   * Why Zustand first?
   * - Token is available immediately after login (in memory)
   * - If app closes quickly, token is still in Zustand memory
   * - Avoids race condition where secureStorage.setToken() hasn't finished yet
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
      token = await secureStorage.getToken();
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
        if (response.status === 401) {
          const error = new Error('Unauthorized');
          (error as any).status = 401;
          throw error;
        }
      }
    } catch (error) {
      console.error('[LocationAPI] Error sending background location:', error);
      throw error;
    }
  },
};
