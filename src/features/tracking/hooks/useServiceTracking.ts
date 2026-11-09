import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as ExpoLocation from 'expo-location';
import { useAuthStore } from '@/features/auth/store/authStore';
import { secureStorage } from '@/core/storage/secureStorage';
import { WORKDAY_BACKGROUND_TASK } from '../tasks/workdayBackgroundTask';
import { useWorkdayTracking } from './useWorkdayTracking';

/**
 * Watchdog that keeps the workday background location task alive.
 *
 * The task must run for the entire shift (AVAILABLE or IN_SERVICE). It is
 * started by useWorkday on shift start, but the OS or the user can kill it:
 *   - OEM battery optimizations
 *   - Process death / app swipe
 *   - A failed initial start (e.g. permission granted after the fact)
 *
 * This hook re-checks the native task state:
 *   - When the workday starts (AVAILABLE / IN_SERVICE)
 *   - Whenever the app returns to the foreground (AppState === 'active')
 *
 * It never stops tracking just because there are no active services or the
 * status is UNAVAILABLE — that would break tracking during idle time between
 * deliveries or after a transient dashboard refresh. Tracking is stopped only
 * by an explicit shift end (useWorkday), logout, or an authoritative
 * UNAVAILABLE profile during session restore.
 */
export function useServiceTracking(): void {
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { startWorkdayTracking, stopWorkdayTracking } = useWorkdayTracking();
  const syncingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const syncTracking = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
          WORKDAY_BACKGROUND_TASK,
        ).catch(() => false);
        if (!mounted) return;

        const workdayActive =
          isAuthenticated &&
          (operationalStatus === 'AVAILABLE' || operationalStatus === 'IN_SERVICE');

        if (workdayActive) {
          if (!isRunning) {
            console.log('[ServiceTracking] Workday active but task is not running, starting');
            const result = await startWorkdayTracking({ interactive: false });
            if (!mounted) return;
            if (!result.success) {
              console.warn('[ServiceTracking] Failed to (re)start tracking:', result.reason);
            }
          }
          return;
        }

        if (!isRunning) return;

        // Do not stop the task while the session is still being restored:
        // at cold start isAuthenticated is false until SecureStore + /me finish.
        const token = accessToken ?? (await secureStorage.getAccessToken());
        if (!mounted) return;

        // A transient UNAVAILABLE from a dashboard refresh must not stop the
        // foreground service. Only a fully cleared session (logout / expired
        // tokens) stops it here; explicit shift end is handled by useWorkday.
        if (!isAuthenticated && !token) {
          console.log('[ServiceTracking] Session cleared, stopping tracking');
          await stopWorkdayTracking();
        }
      } catch (err) {
        console.error('[ServiceTracking] Error syncing tracking state:', err);
      } finally {
        syncingRef.current = false;
      }
    };

    if (mounted) {
      void syncTracking();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mounted) {
        void syncTracking();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [accessToken, isAuthenticated, operationalStatus, startWorkdayTracking, stopWorkdayTracking]);

}
