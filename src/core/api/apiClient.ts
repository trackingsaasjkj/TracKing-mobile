import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { handleApiError } from '@/shared/utils/errorHandler';

const BASE_URL = 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

// Lazy import to avoid circular dependency: apiClient ← authStore ← apiClient
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/features/auth/store/authStore').useAuthStore.getState();
}

// ─── Request interceptor: attach Bearer token ────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthStore().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 refresh + error mapping ────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // ── 401: attempt token refresh once ──────────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/api/auth/refresh');
        // The new token arrives via httpOnly cookie; re-read from store if updated
        const newToken = getAuthStore().accessToken;
        processQueue(null, newToken);
        if (originalRequest.headers && newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        getAuthStore().clearSession();
        // Navigation to Login is handled by RootNavigator reacting to isAuthenticated
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Map status codes to user-facing messages ──────────────────────────────
    const serverMessage = (error.response?.data as { error?: string })?.error;
    const userMessage = handleApiError(status ?? 0, serverMessage);

    return Promise.reject({ ...error, userMessage });
  }
);
