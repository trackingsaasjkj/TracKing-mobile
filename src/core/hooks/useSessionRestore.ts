import { useEffect, useState } from 'react';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { CourierUser } from '@/features/auth/types/auth.types';
import {
  startWorkdayLocationUpdates,
  stopWorkdayLocationUpdates,
} from '@/features/tracking/hooks/useWorkdayTracking';

const RESTORE_TIMEOUT_MS = 8_000; // safety net: never block the app more than 8s

interface CourierMeResponse {
  id: string;
  user_id: string;
  company_id: string;
  operational_status: 'AVAILABLE' | 'UNAVAILABLE' | 'IN_SERVICE';
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Restarts the workday background location task if the courier has an active
 * workday (AVAILABLE or IN_SERVICE) when the app launches (e.g. after a
 * force-close). The task may have been killed by the OS — this ensures it's
 * always running for the entire shift.
 *
 * Tracking starts on shift start and must survive screen-off, lock and app
 * background/close, so it cannot depend on the services store being populated.
 */
async function restoreWorkdayTracking(): Promise<void> {
  try {
    // Restore tracking for the whole active workday, not just IN_SERVICE.
    // If the courier is UNAVAILABLE, there is no shift to track.
    const state = useAuthStore.getState();
    const operationalStatus = state.user?.operationalStatus;
    if (operationalStatus !== 'AVAILABLE' && operationalStatus !== 'IN_SERVICE') {
      console.log('[SessionRestore] No active workday, skipping tracking restore');
      return;
    }

    // Non-interactive: never show permission prompts during startup. The
    // shared starter also checks hasStartedLocationUpdatesAsync first.
    const result = await startWorkdayLocationUpdates({ interactive: false });
    if (!result.success) {
      console.warn('[SessionRestore] Could not restore tracking:', result.reason);
    }
  } catch {
    // expo-task-manager unavailable in Expo Go — silently ignore
  }
}

export function useSessionRestore() {
  const [isRestoring, setIsRestoring] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let done = false;

    // Safety net: if restore takes longer than RESTORE_TIMEOUT_MS, unblock the app
    const safetyTimer = setTimeout(() => {
      if (!done) {
        done = true;
        setIsRestoring(false);
      }
    }, RESTORE_TIMEOUT_MS);

    async function restore() {
      try {
        const token = await secureStorage.getAccessToken();
        const refreshToken = await secureStorage.getRefreshToken();
        console.log('[SessionRestore] Tokens retrieved:', {
          hasAccessToken: !!token,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: token?.length ?? 0,
          refreshTokenLength: refreshToken?.length ?? 0
        });
        
        if (!token) {
          console.log('[SessionRestore] No access token, going to login');
          return; // no stored token — go straight to login
        }

        console.log('[SessionRestore] Calling /api/courier/me to validate session');
        const res = await apiClient.get<ApiResponse<CourierMeResponse>>('/api/courier/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = unwrap(res);

        const user: CourierUser = {
          id: profile.user_id,
          name: profile.user.name,
          email: profile.user.email,
          role: 'COURIER',
          company_id: profile.company_id,
          operationalStatus: profile.operational_status,
        };

        // The request may have refreshed the tokens. Re-read them so we don't
        // overwrite the fresh access token with the expired one.
        const currentState = useAuthStore.getState();
        const currentAccessToken = currentState.accessToken ?? token;
        const currentRefreshToken = currentState.refreshToken ?? refreshToken;

        await setSession(user, currentAccessToken, currentRefreshToken ?? undefined);
        console.log('[SessionRestore] Session restored successfully');

        // If the courier has an active workday (AVAILABLE or IN_SERVICE),
        // ensure the background location task is running — it may have been
        // killed by the OS while the app was closed.
        if (
          profile.operational_status === 'AVAILABLE' ||
          profile.operational_status === 'IN_SERVICE'
        ) {
          await restoreWorkdayTracking();
        } else {
          // Authoritative UNAVAILABLE at launch: the shift already ended, so
          // make sure a leftover task from a previous process does not keep
          // reporting location.
          await stopWorkdayLocationUpdates();
        }
      } catch (err: any) {
        console.log('[SessionRestore] Error during restore:', err);
        // Only a rejected/expired token invalidates the session. Network or
        // server errors must keep the stored session for the next launch.
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          await clearSession();
        } else {
          console.warn('[SessionRestore] Keeping stored session after transient error');
        }
      } finally {
        // Always unblock, regardless of outcome
        if (!done) {
          done = true;
          clearTimeout(safetyTimer);
          setIsRestoring(false);
        }
      }
    }

    restore();

    return () => {
      // On unmount: mark done so safetyTimer doesn't call setState on dead component
      done = true;
      clearTimeout(safetyTimer);
    };
  }, [setSession, clearSession]);

  return { isRestoring };
}
