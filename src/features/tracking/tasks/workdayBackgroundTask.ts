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
 * Uses sendFromBackground() which reads the JWT directly from SecureStore,
 * since the Zustand store may not be initialized in the background process.
 */
TaskManager.defineTask(
  WORKDAY_BACKGROUND_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: ExpoLocation.LocationObject[] }>) => {
    if (error) {
      console.warn('[WorkdayTracking] Task error:', error.message);
      return;
    }

    if (!data?.locations?.length) return;

    const { latitude, longitude, accuracy } = data.locations[0].coords;

    try {
      await locationApi.sendFromBackground({
        latitude,
        longitude,
        ...(accuracy != null && { accuracy }),
      });
    } catch (err: any) {
      // 401 = session expired — stop the task
      if (err?.status === 401 || err?.response?.status === 401) {
        const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(
          WORKDAY_BACKGROUND_TASK,
        ).catch(() => false);
        if (isRunning) {
          await ExpoLocation.stopLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK).catch(() => {});
        }
      }
      // All other errors (network, timeout, 400) are silently swallowed
    }
  },
);
