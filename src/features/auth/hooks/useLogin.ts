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
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Login] INICIANDO SESIÓN');
    console.log('[Login] Email:', email);
    console.log('═══════════════════════════════════════════════════════════');
    
    setError(null);
    setIsLoading(true);
    try {
      console.log('[Login] Llamando authApi.login()...');
      
      // Backend returns: { id, name, email, role, company_id, accessToken, refreshToken }
      const userData = await authApi.login({ email, password });
      
      console.log('[Login] ✅ RESPUESTA RECIBIDA del backend:');
      console.log('[Login] Response received:', {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        company_id: userData.company_id,
        hasAccessToken: !!userData.accessToken,
        hasRefreshToken: !!userData.refreshToken,
      });

      // Only allow COURIER role to use the mobile app
      if (userData.role !== 'COURIER') {
        console.log('[Login] ❌ ERRO: Usuario NO es COURIER, es:', userData.role);
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
      console.log('[Login] Guardando tokens en el store...');
      await setSession(user, userData.accessToken, userData.refreshToken);
      console.log('[Login] ✅ Tokens guardados correctamente');

      // Fetch real operational status — login response doesn't include it
      try {
        console.log('[Login] Buscando profile...');
        const profile = await dashboardApi.getProfile();
        console.log('[Login] ✅ Profile obtenido:', profile);
        user.operationalStatus = profile.operational_status;
        await setSession(user, userData.accessToken, userData.refreshToken);
      } catch (profileErr) {
        console.warn('[Login] ⚠️  No se pudo obtener profile:', profileErr);
        // Non-critical: useDashboard will sync it on mount
      }
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[Login] ✅✅✅ LOGIN EXITOSO ✅✅✅');
      console.log('═══════════════════════════════════════════════════════════');
    } catch (err: unknown) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('[Login] ❌ ERROR EN LOGIN');
      console.error('[Login] Message:', (err as Error)?.message);

      const apiErr = err as { 
        response?: { status?: number; data?: any }; 
        userMessage?: string;
        message?: string;
        code?: string;
      };
      
      const status = apiErr?.response?.status;
      
      console.error('[Login] Error details:', {
        status,
        statusText: (err as any)?.response?.statusText,
        responseData: apiErr?.response?.data,
        userMessage: apiErr?.userMessage,
        message: apiErr?.message,
        code: apiErr?.code,
      });
      console.error('═══════════════════════════════════════════════════════════');

      if (status === 429) {
        setError('Demasiados intentos. Por favor espera.');
        startCooldown(60);
      } else if (status === 401) {
        setError('Email o contraseña incorrectos.');
      } else {
        const errorMsg = apiErr?.userMessage ?? apiErr?.message ?? 'Error al iniciar sesión. Intenta de nuevo.';
        console.error('[Login] Mostrando error:', errorMsg);
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error, cooldownSeconds };
}
