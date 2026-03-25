import { useEffect, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '../api/locationApi';

const INTERVAL_MS = 15_000;

interface UseLocationOptions {
  /** Tracking only runs when this is true */
  active: boolean;
}

/**
 * Requests foreground location permission and, while `active` is true,
 * sends the courier's position to the backend every 15 seconds.
 */
export function useLocation({ active }: UseLocationOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const permissionGranted = useRef(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionGranted.current) return true;
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    permissionGranted.current = status === 'granted';
    return permissionGranted.current;
  }, []);

  const sendLocation = useCallback(async () => {
    try {
      const granted = await requestPermission();
      if (!granted) return;

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      await locationApi.send({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
      });
    } catch {
      // Silently swallow — tracking errors must not interrupt the courier's flow
    }
  }, [requestPermission]);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send immediately on activation, then every 15s
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, sendLocation]);
}
