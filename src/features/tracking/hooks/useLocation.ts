import { useEffect, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';
import { useTrackingStore } from '../store/trackingStore';

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
 * Manages FOREGROUND-only location tracking (the 15s setInterval).
 *
 * Background tracking is handled exclusively by workdayBackgroundTask
 * (WORKDAY_BACKGROUND_TASK) which starts when the courier begins their
 * shift and runs for the entire shift duration, even when the app is
 * minimized or closed.
 *
 * This hook is intentionally simplified — it no longer starts its own
 * background task (BACKGROUND_LOCATION_TASK) to avoid running two
 * simultaneous ForegroundServices on Android, which can cause conflicts
 * on some devices. The workday task already covers the IN_SERVICE period.
 *
 * Lifecycle:
 *   active=true  → request foreground permission → start 15s interval
 *   active=false → clear interval → clear coords from store
 *
 * Coords are written to useTrackingStore so any screen can read them
 * without calling this hook a second time.
 *
 * Error handling:
 *   - Backend 400 → stop tracking (courier left IN_SERVICE state)
 *   - Network / GPS errors → swallowed silently (must not interrupt courier flow)
 */
export function useLocation({ active }: UseLocationOptions): LocationState {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundGranted = useRef(false);
  const stoppedByBackend = useRef(false);

  const setCoords = useTrackingStore((s) => s.setCoords);
  const setPermissionDenied = useTrackingStore((s) => s.setPermissionDenied);
  const clearCoords = useTrackingStore((s) => s.clearCoords);
  const latitude = useTrackingStore((s) => s.latitude);
  const longitude = useTrackingStore((s) => s.longitude);
  const permissionDenied = useTrackingStore((s) => s.permissionDenied);

  // ── Permission helper ─────────────────────────────────────────────────────

  const requestForegroundPermission = useCallback(async (): Promise<boolean> => {
    if (foregroundGranted.current) return true;
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    foregroundGranted.current = status === 'granted';
    if (!foregroundGranted.current) setPermissionDenied(true);
    return foregroundGranted.current;
  }, [setPermissionDenied]);

  // ── Stop helper ───────────────────────────────────────────────────────────

  const stopForeground = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Send location (foreground) ────────────────────────────────────────────

  const sendLocation = useCallback(async () => {
    if (stoppedByBackend.current) return;

    try {
      const granted = await requestForegroundPermission();
      if (!granted) return;

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      // Write to shared store — HomeScreen and ServiceDetailScreen both read from there
      setCoords(loc.coords.latitude, loc.coords.longitude);

      await locationApi.send({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        // accuracy is in meters — omit if null/undefined (do NOT send 0)
        ...(loc.coords.accuracy != null && { accuracy: loc.coords.accuracy }),
      });
    } catch (err: any) {
      if (err?.response?.status === 400) {
        // Backend says courier is not IN_SERVICE — stop foreground tracking
        stoppedByBackend.current = true;
        stopForeground();
      }
      // All other errors (network, GPS) are swallowed silently
    }
  }, [requestForegroundPermission, setCoords, stopForeground]);

  // ── Effect: start/stop based on active flag ───────────────────────────────

  useEffect(() => {
    if (!active) {
      stoppedByBackend.current = false;
      clearCoords();
      stopForeground();
      return;
    }

    stoppedByBackend.current = false;

    // Foreground: send immediately, then every 15s
    // Background is handled by WORKDAY_BACKGROUND_TASK (started at shift start)
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      stopForeground();
    };
  }, [active, sendLocation, stopForeground, clearCoords]);

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
