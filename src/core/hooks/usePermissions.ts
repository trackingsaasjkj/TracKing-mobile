import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';

/**
 * Requests all permissions the app needs at startup.
 *
 * Called in RootNavigator so it runs as soon as the app mounts,
 * regardless of whether the user is authenticated.
 *
 * Order matters on Android:
 *   1. Foreground location  — must be granted before background
 *   2. Background location  — required for workday tracking task
 *   3. Camera               — required for delivery evidence photos
 *
 * The OS only shows the dialog once per permission. Subsequent calls
 * return the cached status without showing a dialog again, so calling
 * this on every mount is safe.
 */
export function usePermissions() {
  // useRef instead of useState — we don't need a re-render, just a guard
  // against running twice in React Strict Mode double-invoke
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    async function requestAll() {
      try {
        // 1. Foreground location (required before background on Android)
        await Location.requestForegroundPermissionsAsync();

        // 2. Background location (ACCESS_BACKGROUND_LOCATION — needed for workday task)
        await Location.requestBackgroundPermissionsAsync();

        // 3. Camera (delivery evidence photos)
        await Camera.requestCameraPermissionsAsync();
      } catch {
        // Permissions API unavailable (e.g. Expo Go simulator) — silently ignore
      }
    }

    requestAll();
  }, []);
}
