import axios from 'axios';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import { secureStorage } from '@/core/storage/secureStorage';

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
   * Background: reads token directly from SecureStore.
   * Usamos fetch en lugar de axios porque XMLHttpRequest (que usa axios)
   * puede ser inestable en contextos Headless JS (segundo plano) en Android.
   */
  sendFromBackground: async (payload: LocationPayload): Promise<void> => {
    const token = await secureStorage.getToken();
    if (!token) return; // no session — skip silently

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
  },
};
