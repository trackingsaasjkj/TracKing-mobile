import { useState, useEffect } from 'react';
import { wsClient, type WsConnectionStatus } from '@/core/api/wsClient';

/**
 * Returns the current WebSocket connection status.
 * Subscribes to status changes so the component re-renders automatically.
 */
export function useWsStatus(): WsConnectionStatus {
  const [status, setStatus] = useState<WsConnectionStatus>(wsClient.status);

  useEffect(() => {
    return wsClient.onStatusChange(setStatus);
  }, []);

  return status;
}
