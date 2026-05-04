import { useEffect, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';
import { BACKGROUND_LOCATION_TASK } from '../tasks/backgroundLocationTask';
import { useTrackingStore } from '../store/trackingStore';
import { colors } from '@/shared/ui/colors';

const INTERVAL_MS = 15_000;

interface UseLocationOptions {
  /** Tracking only runs when this is true (operationalStatus === IN_SERVICE) */
  active: boolean;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionDenied: boolean;
}

/**
 * Manages foreground + background location tracking.
 *
 * Lifecycle:
 *   active=true  → request permissions → start background task → start foreground interval
 *   active=false → stop background task → clear foreground interval
 *
 * Coords are written to useTrackingStore so any screen can read them without
 * calling this hook a second time. Calling this hook twice with active=true
 * would create two foreground intervals — avoid that by using useTrackingCoords
 * in components that only need to read the current position.
 *
 * Error handling:
 *   - Backend 400 → stop tracking (courier left IN_SERVICE state)
 *   - Network / GPS errors → swallowed silently (must not interrupt courier flow)
 *
 * Background task is defined in tasks/backgroundLocationTask.ts and registered
 * in index.ts before the React tree mounts.
 */
export function useLocation({ active }: UseLocationOptions): LocationState {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundGranted = useRef(false);
  const backgroundGranted = useRef(false);
  const stoppedByBackend = useRef(false);

  const setCoords = useTrackingStore((s) => s.setCoords);
  const setPermissionDenied = useTrackingStore((s) => s.setPermissionDenied);
  const clearCoords = useTrackingStore((s) => s.clearCoords);
  const latitude = useTrackingStore((s) => s.latitude);
  const longitude = useTrackingStore((s) => s.longitude);
  const permissionDenied = useTrackingStore((s) => s.permissionDenied);

  // ── Permission helpers ────────────────────────────────────────────────────

  const requestForegroundPermission = useCallback(async (): Promise<boolean> => {
    if (foregroundGranted.current) return true;
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    foregroundGranted.current = status === 'granted';
    if (!foregroundGranted.current) setPermissionDenied(true);
    return foregroundGranted.current;
  }, [setPermissionDenied]);

  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    if (backgroundGranted.current) return true;
    const { status } = await ExpoLocation.requestBackgroundPermissionsAsync();
    backgroundGranted.current = status === 'granted';
    if (!backgroundGranted.current) {
      console.warn('[useLocation] Background location permission denied. Status:', status);
    } else {
      console.log('[useLocation] Background location permission granted');
    }
    return backgroundGranted.current;
  }, []);

  // ── Stop helpers ──────────────────────────────────────────────────────────

  const stopForeground = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopBackground = useCallback(async () => {
    try {
      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) {
        await ExpoLocation.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // Ignore — task may not be registered in Expo Go dev mode
    }
  }, []);

  const stopAll = useCallback(async () => {
    stopForeground();
    await stopBackground();
  }, [stopForeground, stopBackground]);

  // ── Send location (foreground) ────────────────────────────────────────────

  const sendLocation = useCallback(async () => {
    if (stoppedByBackend.current) return;

    try {
      const granted = await requestForegroundPermission();
      if (!granted) return;

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      // Write to shared store — TrackingScreen and ServiceDetailScreen both read from there
      setCoords(loc.coords.latitude, loc.coords.longitude);

      await locationApi.send({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        // accuracy is in meters — omit if null/undefined (do NOT send 0)
        ...(loc.coords.accuracy != null && { accuracy: loc.coords.accuracy }),
      });
    } catch (err: any) {
      if (err?.response?.status === 400) {
        // Backend says courier is not IN_SERVICE — stop tracking
        stoppedByBackend.current = true;
        stopForeground();
        await stopBackground();
      }
      // All other errors (network, GPS) are swallowed silently
    }
  }, [requestForegroundPermission, setCoords, stopForeground, stopBackground]);

  // ── Start background task ─────────────────────────────────────────────────

  const startBackground = useCallback(async () => {
    try {
      const hasBackground = await requestBackgroundPermission();
      if (!hasBackground) {
        console.warn('[useLocation] Background location permission denied');
        return;
      }

      const isRunning = await ExpoLocation.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) {
        console.log('[useLocation] Background task already running');
        return; // already running — guard against double registration
      }

      await ExpoLocation.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: INTERVAL_MS,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true, // iOS: blue bar
        foregroundService: {
          // Android 8+: required persistent notification for background location
          notificationTitle: 'Tracking activo',
          notificationBody: 'Tu ubicación está siendo compartida durante el servicio.',
          notificationColor: colors.primary,
        },
      });
      console.log('[useLocation] Background location task started successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[useLocation] Error starting background task:', errorMsg);
      // expo-task-manager is not available in Expo Go — foreground-only fallback
    }
  }, [requestBackgroundPermission]);

  // ── Effect: start/stop based on active flag ───────────────────────────────

  useEffect(() => {
    if (!active) {
      stoppedByBackend.current = false;
      clearCoords();
      stopAll();
      return;
    }

    stoppedByBackend.current = false;

    // Start background task first (persists when app is minimized)
    startBackground();

    // Foreground: send immediately, then every 15s
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      stopAll();
    };
  }, [active, sendLocation, startBackground, stopAll, clearCoords]);

  return { latitude, longitude, permissionDenied };
}

/**
 * Read-only hook for components that need the current courier coords
 * but should NOT start/stop the tracking loop themselves.
 *
 * Use this in ServiceDetailScreen instead of useLocation to avoid
 * creating a second foreground interval.
 */
export function useTrackingCoords(): LocationState {
  const latitude = useTrackingStore((s) => s.latitude);
  const longitude = useTrackingStore((s) => s.longitude);
  const permissionDenied = useTrackingStore((s) => s.permissionDenied);
  return { latitude, longitude, permissionDenied };
}
