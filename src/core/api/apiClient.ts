import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { handleApiError } from '@/shared/utils/errorHandler';

/**
 * Backend API URL configuration.
 * 
 * URL hardcodeada para todas las plataformas.
 * Cambiar aquí si necesitas usar un backend diferente.
 * 
 * Desarrollo: http://192.168.1.2:3000 (reemplaza con tu IP local)
 * Producción: https://tracking-backend-g4mq.onrender.com
 */
const BASE_URL = 'http://192.168.1.2:3000';

/** Wrapper estandar de todas las respuestas del backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Extrae `data` de la respuesta estandar del backend */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000, // 10s — evita que la app quede cargando si el backend no responde
});

// Lazy import to avoid circular dependency: apiClient <- authStore <- apiClient
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authStoreModule = require('@/features/auth/store/authStore');
  const secureStorageModule = require('@/core/storage/secureStorage');
  return {
    ...authStoreModule.useAuthStore.getState(),
    secureStorage: secureStorageModule.secureStorage,
  };
}

// Request interceptor: attach Bearer token
// NOTA: Los interceptores de request deben ser síncronos, así que usamos tokens del store en memoria
// Los tokens se guardan en secure store para persistencia, pero se usan desde memoria en requests
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // NO adjuntar token en el endpoint de refresh
  // El refresh endpoint espera el refresh_token en el body
  if (config.url?.includes('/api/auth/refresh')) {
    console.log('[Request] Refresh token request - NOT attaching accessToken');
    return config;
  }
  
  // Obtener accessToken del store en memoria (rápido y síncrono)
  const token = getAuthStore().accessToken;
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[Request] Bearer token attached');
  }
  return config;
});

// Response interceptor: handle 401 refresh + error mapping
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
  (response) => {
    // NO transformar la respuesta aquí
    // Dejar que la respuesta sea exactamente como viene del backend
    // El cliente (authApi, etc) usará unwrap() si necesita extraer data
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // Log para debugging
    console.log('[Response] Error interceptor triggered:', {
      url: originalRequest.url,
      status,
      statusText: error.response?.statusText,
      message: error.message
    });

    if (originalRequest.url?.includes('/api/auth/refresh')) {
      console.log('[Response] Refresh endpoint error:', {
        status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    }

    // 401: attempt token refresh once
    // Skip refresh for auth endpoints — login/refresh failures should go straight to error handler
    const isAuthEndpoint =
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      console.log('[Response] 401 detected, attempting refresh...');
      
      if (isRefreshing) {
        console.log('[Response] Already refreshing, queueing request');
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
        // Obtener el refresh token del secure store
        console.log('[Refresh] Attempting to refresh token...');
        
        const refreshToken = await getAuthStore().secureStorage.getRefreshToken();
        console.log('[Refresh] refreshToken from secure store:', {
          hasRefreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length ?? 0,
          refreshTokenStart: refreshToken?.substring(0, 20) ?? 'null'
        });
        
        if (!refreshToken) {
          throw new Error('No refresh token available in secure store');
        }
        
        // Usar axios directamente para evitar que el interceptor de request interfiera
        // Enviar el refresh token en el body (más seguro que en el header)
        console.log('[Refresh] Sending refresh request with refreshToken in body');
        const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('[Refresh] Response received:', { 
          success: response.data.success,
          hasData: !!response.data.data,
          hasAccessToken: !!response.data.data?.accessToken,
          hasRefreshToken: !!response.data.data?.refreshToken
        });
        
        // Extraer los nuevos tokens de la respuesta
        const newAccessToken = response.data.data?.accessToken;
        const newRefreshToken = response.data.data?.refreshToken;
        
        // Validar que ambos tokens existan y actualizar el store
        if (newAccessToken && newRefreshToken) {
          const authStore = getAuthStore();
          if (authStore.user) {
            authStore.setSession(authStore.user, newAccessToken, newRefreshToken);
            console.log('[Refresh] Token updated successfully in store and secure storage');
          }
        } else {
          throw new Error('Refresh token response missing accessToken or refreshToken');
        }
        
        // Esperar a que los tokens se guarden en secure storage
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Re-read current token from store en memoria (ahora es el nuevo token)
        const currentToken = getAuthStore().accessToken ?? '';
        console.log('[Refresh] Processing queue with new token');
        processQueue(null, currentToken);

        if (originalRequest.headers && currentToken) {
          originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[Refresh] Failed to refresh token:', refreshError);
        processQueue(refreshError, null);
        getAuthStore().clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Map status codes to user-facing messages
    // BUG-12 FIX: backend error shape is { success: false, statusCode, error }
    // NestJS validation errors: { message: string[] | string, error, statusCode }
    // NestJS auth errors: { message: string, error: "Unauthorized", statusCode: 401 }
    const responseData = error.response?.data as
      | { error?: string; message?: string | string[] }
      | undefined;
    const rawMessage = responseData?.message ?? responseData?.error;
    const serverMessage = Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage;
    const userMessage = handleApiError(status ?? 0, serverMessage);

    return Promise.reject(Object.assign(error, { userMessage }));
  }
);
