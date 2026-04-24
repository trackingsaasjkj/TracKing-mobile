import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface AutoRefreshOptions {
  /** Polling interval in ms when app is in foreground. Default: 45_000 (45s) */
  foregroundInterval?: number;
  /** Whether polling is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Automatically calls `onRefresh` on a configurable interval while the app
 * is in the foreground, and immediately when the app returns from background.
 *
 * This acts as the polling fallback layer when WebSocket is unavailable.
 */
export function useAutoRefresh(
  onRefresh: () => void,
  options: AutoRefreshOptions = {},
): void {
  const { foregroundInterval = 45_000, enabled = true } = options;

  // Stable ref so interval/AppState handlers always call the latest version
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  const triggerRefresh = useCallback(() => {
    onRefreshRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Periodic polling while in foreground
    const intervalId = setInterval(triggerRefresh, foregroundInterval);

    // Immediate refresh when returning from background/inactive
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive) {
        triggerRefresh();
      }

      appState.current = nextState;
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [enabled, foregroundInterval, triggerRefresh]);
}
