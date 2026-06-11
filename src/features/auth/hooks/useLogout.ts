import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '@/core/api/apiClient';
import { useRoutesStore } from '@/features/routes/store/routesStore';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearActiveRoute = useRoutesStore((s) => s.clearActiveRoute);

  async function logout() {
    setIsLoading(true);
    try {
      // Eliminar FCM token antes de cerrar sesión
      await apiClient.delete('/notifications/fcm-token').catch(() => {});
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local session
    } finally {
      clearActiveRoute();
      await clearSession();
      setIsLoading(false);
    }
  }

  return { logout, isLoading };
}
