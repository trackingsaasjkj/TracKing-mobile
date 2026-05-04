import { useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { WORKDAY_BACKGROUND_TASK } from '../tasks/workdayBackgroundTask';
import { colors } from '@/shared/ui/colors';

export interface WorkdayTrackingResult {
  success: boolean;
  reason?: string;
}

/**
 * Manages the workday-level background location task.
 *
 * This is separate from useLocation (which handles IN_SERVICE tracking).
 * Call startWorkdayTracking() when the courier starts their shift and
 * stopWorkdayTracking() when they end it.
 *
 * The task runs even when the app is closed, ensuring the backend always
 * knows where available couriers are throughout the entire workday.
 *
 * Returns a result object with success status and reason for failure (if any).
 */
export function useWorkdayTracking() {
  const startWorkdayTracking = useCallback(async (): Promise<WorkdayTrackingResult> => {
    try {
      // Ensure foreground permission first (required before background)
      const { status: fgStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('[WorkdayTracking] Foreground location permission denied');
        return { success: false, reason: 'Permiso de ubicación denegado' };
      }

      // Request background permission (ACCESS_BACKGROUND_LOCATION on Android)
      const { status: bgStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.warn('[WorkdayTracking] Background location permission denied');
        return {
          success: false,
          reason: 'Permiso de ubicación en background denegado. Ve a Configuración > Permisos > Ubicación y selecciona "Permitir todo el tiempo"',
        };
      }

      // Guard against double registration
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
        WORKDAY_BACKGROUND_TASK,
      ).catch(() => false);
      if (isRunning) {
        console.log('[WorkdayTracking] Task already running');
        return { success: true, reason: 'Rastreo ya estaba activo' };
      }

      await ExpoLocation.startLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK, {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 15_000,   // every 15 seconds
        distanceInterval: 0,    // no distance threshold — rely only on timeInterval
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Jornada activa',
          notificationBody: 'Tu ubicación se comparte mientras estás en jornada.',
          notificationColor: colors.primary,
        },
      });

      console.log('[WorkdayTracking] Background location task started successfully');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[WorkdayTracking] Error starting background task:', errorMsg);
      return {
        success: false,
        reason: `Error iniciando rastreo: ${errorMsg}`,
      };
    }
  }, []);

  const stopWorkdayTracking = useCallback(async (): Promise<WorkdayTrackingResult> => {
    try {
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
        WORKDAY_BACKGROUND_TASK,
      ).catch(() => false);
      if (isRunning) {
        await ExpoLocation.stopLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK);
        console.log('[WorkdayTracking] Background location task stopped');
        return { success: true };
      }
      console.log('[WorkdayTracking] Task was not running');
      return { success: true, reason: 'Rastreo no estaba activo' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[WorkdayTracking] Error stopping background task:', errorMsg);
      return {
        success: false,
        reason: `Error deteniendo rastreo: ${errorMsg}`,
      };
    }
  }, []);

  return { startWorkdayTracking, stopWorkdayTracking };
}
