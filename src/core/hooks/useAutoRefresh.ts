import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface AutoRefreshOptions {
  /** Polling interval in ms when app is in foreground. Default: 15_000 (15s) */
  foregroundInterval?: number;
  /** Maximum number of retry attempts on failure. Default: 3 */
  maxRetries?: number;
  /** Whether polling is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Automatically calls `onRefresh` on a configurable interval while the app
 * is in the foreground, and immediately when the app returns from background.
 *
 * This acts as the polling fallback layer when WebSocket is unavailable.
 * 
 * Includes retry logic: if a refresh fails, it will retry up to maxRetries times
 * before giving up and waiting for the next interval.
 */
export function useAutoRefresh(
  onRefresh: () => void,
  options: AutoRefreshOptions = {},
): void {
  const { foregroundInterval = 15_000, maxRetries = 3, enabled = true } = options;

  // Stable ref so interval/AppState handlers always call the latest version
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const retryCountRef = useRef(0);

  const triggerRefresh = useCallback(async () => {
    try {
      await onRefreshRef.current();
      retryCountRef.current = 0; // Reset retry counter on success
    } catch (error) {
      // Retry logic: if refresh fails, retry up to maxRetries times
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        // Retry after a short delay (exponential backoff: 1s, 2s, 4s)
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 4000);
        setTimeout(() => {
          triggerRefresh();
        }, retryDelay);
      }
      // If max retries exceeded, just wait for next interval
    }
  }, [maxRetries]);

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
