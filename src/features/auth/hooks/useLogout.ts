import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '@/core/api/apiClient';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    setIsLoading(true);
    try {
      // Eliminar FCM token antes de cerrar sesión
      await apiClient.delete('/notifications/fcm-token').catch(() => {});
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local session
    } finally {
      await clearSession();
      setIsLoading(false);
    }
  }

  return { logout, isLoading };
}
