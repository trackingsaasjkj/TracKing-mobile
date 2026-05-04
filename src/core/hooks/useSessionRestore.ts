import { useEffect, useState } from 'react';
import { secureStorage } from '@/core/storage/secureStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { CourierUser } from '@/features/auth/types/auth.types';
import * as ExpoLocation from 'expo-location';
import { WORKDAY_BACKGROUND_TASK } from '@/features/tracking/tasks/workdayBackgroundTask';
import { colors } from '@/shared/ui/colors';

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
 * Restarts the workday background location task if the courier is already
 * IN_SERVICE when the app launches (e.g. after a force-close).
 * The task may have been killed by the OS — this ensures it's always running
 * during an active service delivery.
 *
 * Note: If the courier is AVAILABLE (no active services), tracking is NOT
 * restarted. It will be started automatically by useServiceTracking when
 * the courier accepts a service.
 */
async function restoreWorkdayTracking(): Promise<void> {
  try {
    const { status: fgStatus } = await ExpoLocation.getForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return;

    const { status: bgStatus } = await ExpoLocation.getBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return;

    const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
      WORKDAY_BACKGROUND_TASK,
    ).catch(() => false);
    if (isRunning) return; // already running — nothing to do

    // Only restore tracking if courier is IN_SERVICE (actively delivering)
    // If AVAILABLE, useServiceTracking will start it when a service is accepted
    const state = useAuthStore.getState();
    if (state.user?.operationalStatus !== 'IN_SERVICE') {
      console.log('[SessionRestore] Courier not IN_SERVICE, skipping tracking restore');
      return;
    }

    await ExpoLocation.startLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK, {
      accuracy: ExpoLocation.Accuracy.Balanced,
      timeInterval: 15_000,
      distanceInterval: 0,    // no distance threshold — rely only on timeInterval
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Jornada activa',
        notificationBody: 'Tu ubicación se comparte mientras estás en jornada.',
        notificationColor: colors.primary,
      },
    });
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
        const token = await secureStorage.getToken();
        if (!token) return; // no stored token — go straight to login

        const res = await apiClient.get<ApiResponse<CourierMeResponse>>('/api/courier/me');
        const profile = unwrap(res);

        const user: CourierUser = {
          id: profile.user_id,
          name: profile.user.name,
          email: profile.user.email,
          role: 'COURIER',
          company_id: profile.company_id,
          operationalStatus: profile.operational_status,
        };

        setSession(user, token);

        // If the courier is IN_SERVICE (actively delivering), ensure the background
        // location task is running — it may have been killed by the OS.
        // If AVAILABLE, useServiceTracking will start it when a service is accepted.
        if (profile.operational_status === 'IN_SERVICE') {
          await restoreWorkdayTracking();
        }
      } catch {
        // Token invalid, expired, or network error — force re-login
        clearSession();
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
