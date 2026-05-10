import { useState, useRef } from 'react';
import { authApi } from '../api/authApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { useAuthStore } from '../store/authStore';
import type { CourierUser } from '../types/auth.types';

interface UseLoginResult {
  login: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  cooldownSeconds: number;
}

export function useLogin(): UseLoginResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  function startCooldown(seconds: number) {
    setCooldownSeconds(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function login(email: string, password: string) {
    setError(null);
    setIsLoading(true);
    try {
      // Backend returns: { id, name, email, role, company_id, accessToken, refreshToken }
      const userData = await authApi.login({ email, password });
      
      console.log('[Login] Response received:', {
        hasAccessToken: !!userData.accessToken,
        hasRefreshToken: !!userData.refreshToken,
        accessTokenLength: userData.accessToken?.length ?? 0,
        refreshTokenLength: userData.refreshToken?.length ?? 0
      });

      // Only allow COURIER role to use the mobile app
      if (userData.role !== 'COURIER') {
        setError('Esta app es exclusiva para mensajeros.');
        return;
      }

      const user: CourierUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: 'COURIER',
        company_id: userData.company_id,
        operationalStatus: 'UNAVAILABLE',
      };

      // Save both accessToken and refreshToken
      console.log('[Login] Saving tokens to store');
      console.log('[Login] accessToken:', userData.accessToken?.substring(0, 20) + '...');
      console.log('[Login] refreshToken:', userData.refreshToken?.substring(0, 20) + '...');
      setSession(user, userData.accessToken, userData.refreshToken);

      // Fetch real operational status — login response doesn't include it
      try {
        const profile = await dashboardApi.getProfile();
        user.operationalStatus = profile.operational_status;
        setSession(user, userData.accessToken, userData.refreshToken);
      } catch {
        // Non-critical: useDashboard will sync it on mount
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number }; userMessage?: string };
      const status = apiErr?.response?.status;

      if (status === 429) {
        setError('Demasiados intentos. Por favor espera.');
        startCooldown(60);
      } else if (status === 401) {
        setError('Email o contraseña incorrectos.');
      } else {
        setError(apiErr?.userMessage ?? 'Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error, cooldownSeconds };
}
