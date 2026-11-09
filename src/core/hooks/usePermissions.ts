import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

/**
 * Requests all permissions the app needs at startup.
 *
 * Called in RootNavigator so it runs as soon as the app mounts,
 * regardless of whether the user is authenticated.
 *
 * Order matters on Android:
 *   1. Foreground location  — needed by the foreground tracking service
 *   2. Camera               — required for delivery evidence photos
 *   3. Notifications        — Android 13+; makes the foreground service
 *                             notification visible while tracking in background
 *
 * Background location is NOT requested here. The workday tracking uses an
 * Android foreground service, which only needs the "while in use" permission.
 * Requesting background permission at startup opens the Settings screen on
 * Android 11+ and burns the one-time prompt. It is requested (best-effort)
 * only when the courier starts a shift.
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
        // 1. Foreground location (required by the foreground tracking service)
        await Location.requestForegroundPermissionsAsync();

        // 2. Camera (delivery evidence photos)
        await Camera.requestCameraPermissionsAsync();

        // 3. Notifications (Android 13+) — required so the location foreground
        // service notification is visible while tracking with the screen off.
        if (
          Platform.OS === 'android' &&
          typeof Platform.Version === 'number' &&
          Platform.Version >= 33
        ) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
      } catch {
        // Permissions API unavailable (e.g. Expo Go simulator) — silently ignore
      }
    }

    requestAll();
  }, []);
}
