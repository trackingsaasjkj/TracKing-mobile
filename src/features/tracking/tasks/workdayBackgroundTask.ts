import * as TaskManager from 'expo-task-manager';
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';
import { locationApi } from '../api/locationApi';

export const WORKDAY_BACKGROUND_TASK = 'workday-background-location';

/**
 * Background location task for active service delivery.
 *
 * Lifecycle:
 *   - Starts when the courier accepts a service (first service → ASSIGNED/ACCEPTED/IN_TRANSIT)
 *   - Stops when all services are completed/cancelled (no more active services)
 *
 * This ensures location is sent to the backend only while the courier is actively
 * delivering a service, not during idle time between services.
 *
 * Managed by useServiceTracking hook which monitors service status changes.
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
