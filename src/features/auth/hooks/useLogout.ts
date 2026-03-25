import { useState } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Even if the API call fails, clear local session
    } finally {
      clearSession();
      setIsLoading(false);
    }
  }

  return { logout, isLoading };
}
