import * as TaskManager from 'expo-task-manager';
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';
import { locationApi } from '../api/locationApi';

export const WORKDAY_BACKGROUND_TASK = 'workday-background-location';

/**
 * Background location task for the whole workday.
 *
 * Lifecycle:
 *   - Starts when the courier starts the shift (AVAILABLE)
 *   - Keeps running during AVAILABLE and IN_SERVICE, including screen-off,
 *     lock and app background/close (Android foreground service)
 *   - Stops only on explicit shift end (UNAVAILABLE) or logout
 *
 * The backend rejects locations while the courier is not IN_SERVICE (400).
 * That is expected: the task keeps the foreground service alive so it can
 * report immediately once the courier starts a service.
 *
 * Managed by useWorkdayTracking (start/stop) and useServiceTracking (watchdog).
 *
 * Uses sendFromBackground() which reads the JWT from Zustand first (in-memory),
 * then falls back to SecureStore (persisted to disk). This ensures the token
 * is available even if the app closes before secureStorage.setAccessToken() completes.
 *
 * Token refresh:
 * - If the access token expires (401), sendFromBackground() automatically attempts
 *   to refresh the token using the refresh token from SecureStore
 * - If refresh succeeds, retries sending the location with the new token
 * - If refresh fails, the task logs the error but continues running
 *   (the next location update will try again)
 */
TaskManager.defineTask(
  WORKDAY_BACKGROUND_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: ExpoLocation.LocationObject[] }>) => {
    const timestamp = new Date().toISOString();
    console.log(`[WorkdayTracking] Background task triggered at ${timestamp}`);
    console.log(`[WorkdayTracking] Platform: ${Platform.OS}`);

    if (error) {
      console.error(`[WorkdayTracking] Task error: ${error.message}`);
      return;
    }

    if (!data?.locations?.length) {
      console.warn('[WorkdayTracking] No locations in task data');
      return;
    }

    const { latitude, longitude, accuracy } = data.locations[0].coords;
    console.log('[WorkdayTracking] Location received:', {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      accuracy: accuracy?.toFixed(2),
      timestamp,
    });

    try {
      await locationApi.sendFromBackground({
        latitude,
        longitude,
        ...(accuracy != null && { accuracy }),
      });
      console.log(`[WorkdayTracking] Location sent successfully at ${timestamp}`);
    } catch (err: any) {
      console.error('[WorkdayTracking] Error sending location:', {
        status: err?.status,
        message: err?.message,
        timestamp,
      });

      // 401 = session expired and refresh failed.
      // Do NOT stop the task here: the refresh may have failed because of a
      // transient network issue while the device was in Doze/screen-off.
      // The next location update will retry the refresh automatically, so
      // tracking resumes as soon as connectivity comes back.
      if (err?.status === 401) {
        console.warn(
          '[WorkdayTracking] Session expired (401) and refresh failed; will retry on next update',
        );
      }
      // All other errors (network, timeout, 400) are logged but not fatal
      // The task will continue running and retry on the next location update
    }
  },
);
