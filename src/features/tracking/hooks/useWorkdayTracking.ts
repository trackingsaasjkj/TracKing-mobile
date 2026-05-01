import { useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { WORKDAY_BACKGROUND_TASK } from '../tasks/workdayBackgroundTask';
import { colors } from '@/shared/ui/colors';

/**
 * Manages the workday-level background location task.
 *
 * This is separate from useLocation (which handles IN_SERVICE tracking).
 * Call startWorkdayTracking() when the courier starts their shift and
 * stopWorkdayTracking() when they end it.
 *
 * The task runs even when the app is closed, ensuring the backend always
 * knows where available couriers are throughout the entire workday.
 */
export function useWorkdayTracking() {
  const startWorkdayTracking = useCallback(async (): Promise<void> => {
    try {
      // Ensure foreground permission first (required before background)
      const { status: fgStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;

      // Request background permission (ACCESS_BACKGROUND_LOCATION on Android)
      const { status: bgStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') return;

      // Guard against double registration
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
        WORKDAY_BACKGROUND_TASK,
      ).catch(() => false);
      if (isRunning) return;

      await ExpoLocation.startLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK, {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 15_000,   // every 15 seconds
        distanceInterval: 10,   // or every 10 meters
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
  }, []);

  const stopWorkdayTracking = useCallback(async (): Promise<void> => {
    try {
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
        WORKDAY_BACKGROUND_TASK,
      ).catch(() => false);
      if (isRunning) {
        await ExpoLocation.stopLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK);
      }
    } catch {
      // Ignore — task may not be registered in Expo Go
    }
  }, []);

  return { startWorkdayTracking, stopWorkdayTracking };
}
