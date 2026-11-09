import { useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { WORKDAY_BACKGROUND_TASK } from '../tasks/workdayBackgroundTask';
import { colors } from '@/shared/ui/colors';

export interface WorkdayTrackingResult {
  success: boolean;
  reason?: string;
  /** Non-fatal issue (e.g. background permission denied while the FGS is enough). */
  warning?: string;
}

export interface StartWorkdayTrackingOptions {
  /**
   * When true, the function may show OS permission prompts (shift start).
   * The watchdog and session restore pass false so they never interrupt the user.
   */
  interactive?: boolean;
}

/**
 * Options used for the workday background location task.
 *
 * These are exported so other flows (e.g. session restore) can start the
 * same task with exactly the same configuration.
 */
export const WORKDAY_LOCATION_TASK_OPTIONS: ExpoLocation.LocationTaskOptions = {
  accuracy: ExpoLocation.Accuracy.Balanced,
  timeInterval: 15_000,   // every 15 seconds
  distanceInterval: 0,    // no distance threshold — rely only on timeInterval
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Jornada activa',
    notificationBody: 'Tu ubicación se comparte mientras estás en jornada.',
    notificationColor: colors.primary,
    // Keep the foreground service alive when the app is swiped away.
    killServiceOnDestroy: false,
  },
};

// Serialize start/stop operations. Multiple hooks (useWorkday, session restore
// and the watchdog) can request tracking at the same time, and two concurrent
// startLocationUpdatesAsync calls can fail on some Android devices.
let operationQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = operationQueue.then(operation, operation);
  operationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function isTaskRunning(): Promise<boolean> {
  return ExpoLocation.hasStartedLocationUpdatesAsync(WORKDAY_BACKGROUND_TASK).catch(
    () => false,
  );
}

async function doStartWorkdayLocationUpdates(
  options: StartWorkdayTrackingOptions,
): Promise<WorkdayTrackingResult> {
  const interactive = options.interactive === true;

  try {
    console.log('[WorkdayTracking] Starting workday tracking...', { interactive });

    // Check first: when the task is already alive we must not request
    // permissions again (on Android 11+ that opens the Settings screen).
    if (await isTaskRunning()) {
      console.log('[WorkdayTracking] Task already running');
      return { success: true, reason: 'Rastreo ya estaba activo' };
    }

    // Location services must be enabled at the OS level
    const servicesEnabled = await ExpoLocation.hasServicesEnabledAsync().catch(() => true);
    if (!servicesEnabled) {
      console.warn('[WorkdayTracking] Location services are disabled');
      return {
        success: false,
        reason: 'Los servicios de ubicación están desactivados. Actívalos en Configuración > Ubicación.',
      };
    }

    // Foreground permission is the only hard requirement on Android. With a
    // foreground service (and FOREGROUND_SERVICE_LOCATION) Android keeps
    // location access while the screen is off without ACCESS_BACKGROUND_LOCATION.
    const fgPermission = interactive
      ? await ExpoLocation.requestForegroundPermissionsAsync()
      : await ExpoLocation.getForegroundPermissionsAsync();
    console.log('[WorkdayTracking] Foreground permission status:', fgPermission.status);
    if (fgPermission.status !== 'granted') {
      console.warn('[WorkdayTracking] Foreground location permission denied');
      return {
        success: false,
        reason: 'Permiso de ubicación denegado. Ve a Configuración > Permisos > Ubicación y selecciona "Permitir"',
      };
    }

    // Background permission is best-effort: the foreground service works with
    // "while in use" permission. Request it only from an interactive flow.
    let warning: string | undefined;
    try {
      const bgPermission = interactive
        ? await ExpoLocation.requestBackgroundPermissionsAsync()
        : await ExpoLocation.getBackgroundPermissionsAsync();
      console.log('[WorkdayTracking] Background permission status:', bgPermission.status);
      if (bgPermission.status !== 'granted') {
        warning =
          'El permiso "Permitir todo el tiempo" está desactivado. El rastreo seguirá activo con el servicio en primer plano.';
        console.warn('[WorkdayTracking] Background permission not granted; continuing with FGS');
      }
    } catch (permissionError) {
      console.warn('[WorkdayTracking] Could not read background permission:', permissionError);
    }

    await ExpoLocation.startLocationUpdatesAsync(
      WORKDAY_BACKGROUND_TASK,
      WORKDAY_LOCATION_TASK_OPTIONS,
    );

    console.log('[WorkdayTracking] Background location task started successfully');
    return { success: true, ...(warning ? { warning } : {}) };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[WorkdayTracking] Error starting background task:', errorMsg);
    return {
      success: false,
      reason: `Error iniciando rastreo: ${errorMsg}`,
    };
  }
}

async function doStopWorkdayLocationUpdates(): Promise<WorkdayTrackingResult> {
  try {
    if (await isTaskRunning()) {
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
}

/**
 * Ensures location tracking is running for the entire workday.
 *
 * Lifecycle (Android):
 *   - Starts when the courier starts their shift (AVAILABLE)
 *   - Keeps running while the app is minimized, the screen is off or locked
 *   - Stops when the courier ends the shift (UNAVAILABLE) or logs out
 *
 * The backend only accepts locations while the courier is IN_SERVICE, so
 * updates sent during AVAILABLE are rejected with 400. That is expected: the
 * important part is that the native foreground service stays alive so it can
 * report immediately once the courier starts a service.
 */
export function startWorkdayLocationUpdates(
  options: StartWorkdayTrackingOptions = {},
): Promise<WorkdayTrackingResult> {
  return enqueue(() => doStartWorkdayLocationUpdates(options));
}

/** Stops the workday location task (shift end / logout). */
export function stopWorkdayLocationUpdates(): Promise<WorkdayTrackingResult> {
  return enqueue(doStopWorkdayLocationUpdates);
}

export function useWorkdayTracking() {
  const startWorkdayTracking = useCallback(
    (options?: StartWorkdayTrackingOptions): Promise<WorkdayTrackingResult> =>
      startWorkdayLocationUpdates(options),
    [],
  );

  const stopWorkdayTracking = useCallback(
    (): Promise<WorkdayTrackingResult> => stopWorkdayLocationUpdates(),
    [],
  );

  return { startWorkdayTracking, stopWorkdayTracking };
}
