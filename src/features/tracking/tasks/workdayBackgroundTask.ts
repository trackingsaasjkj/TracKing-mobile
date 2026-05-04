import * as TaskManager from 'expo-task-manager';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';

export const WORKDAY_BACKGROUND_TASK = 'workday-background-location';

/**
 * Background location task for the entire workday (jornada).
 *
 * Lifecycle:
 *   - Starts when the courier calls startWorkday() → operationalStatus: AVAILABLE
 *   - Stops when the courier calls endWorkday()    → operationalStatus: UNAVAILABLE
 *
 * This ensures location is sent to the backend at all times during the workday,
 * regardless of whether the app is in the foreground, background, or closed.
 *
 * Unlike backgroundLocationTask (which only runs during IN_SERVICE), this task
 * runs for the full duration of the shift so the company always knows where
 * available couriers are.
 *
 * Uses sendFromBackground() which reads the JWT from Zustand first (in-memory),
 * then falls back to SecureStore (persisted to disk). This ensures the token
 * is available even if the app closes before secureStorage.setToken() completes.
 */
TaskManager.defineTask(
  WORKDAY_BACKGROUND_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: ExpoLocation.LocationObject[] }>) => {
    console.log('[WorkdayTracking] Background task triggered');

    if (error) {
      console.error('[WorkdayTracking] Task error:', error.message);
      return;
    }

    if (!data?.locations?.length) {
      console.warn('[WorkdayTracking] No locations in task data');
      return;
    }

    const { latitude, longitude, accuracy } = data.locations[0].coords;
    console.log('[WorkdayTracking] Location received:', { latitude, longitude, accuracy });

    try {
      await locationApi.sendFromBackground({
        latitude,
        longitude,
        ...(accuracy != null && { accuracy }),
      });
      console.log('[WorkdayTracking] Location sent successfully');
    } catch (err: any) {
      console.error('[WorkdayTracking] Error sending location:', {
        status: err?.status,
        message: err?.message,
      });

      // 401 = session expired — stop the task
      if (err?.status === 401) {
        console.warn('[WorkdayTracking] Session expired (401), stopping task');
        const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
          WORKDAY_BACKGROUND_TASK,
        ).catch(() => false);
        if (isRunning) {
          await ExpoLocation.stopLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK).catch(() => {});
        }
      }
      // All other errors (network, timeout, 400) are logged but not fatal
    }
  },
);
