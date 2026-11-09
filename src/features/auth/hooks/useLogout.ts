import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '@/core/api/apiClient';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { useWorkdayTracking } from '@/features/tracking/hooks/useWorkdayTracking';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearActiveRoute = useRoutesStore((s) => s.clearActiveRoute);
  const { stopWorkdayTracking } = useWorkdayTracking();

  async function logout() {
    setIsLoading(true);
    try {
      // Eliminar FCM token antes de cerrar sesión
      await apiClient.delete('/notifications/fcm-token').catch(() => {});
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local session
    } finally {
      // Stop the native foreground service before clearing the session so it
      // does not keep reporting location after logout.
      await stopWorkdayTracking().catch(() => {});
      clearActiveRoute();
      await clearSession();
      setIsLoading(false);
    }
  }

  return { logout, isLoading };
}
