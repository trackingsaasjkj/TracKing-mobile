import { useState, useRef } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import type { CourierUser } from '../types/auth.types';

interface UseLoginResult {
  login: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  cooldownSeconds: number; // > 0 when rate-limited
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
      const userData = await authApi.login({ email, password });
      const user: CourierUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: 'COURIER',
        company_id: userData.company_id,
        operationalStatus: 'UNAVAILABLE',
      };
      // Token comes via httpOnly cookie; store user + empty token string for Bearer header
      // The actual token value is managed by the cookie; we store a sentinel for the interceptor
      setSession(user, '');
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number }; userMessage?: string };
      const status = apiErr?.response?.status;

      if (status === 429) {
        setError('Too many login attempts. Please wait.');
        startCooldown(60);
      } else if (status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(apiErr?.userMessage ?? 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error, cooldownSeconds };
}
