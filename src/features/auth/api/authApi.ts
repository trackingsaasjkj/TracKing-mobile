import { apiClient } from '@/core/api/apiClient';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>(
      '/api/auth/login',
      credentials
    );
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  async refresh(): Promise<void> {
    await apiClient.post('/api/auth/refresh');
  },
};
