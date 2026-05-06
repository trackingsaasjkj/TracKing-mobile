import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useWsStatus } from '@/core/hooks/useWsStatus';

const STATUS_COLOR: Record<string, string> = {
  connected: '#22c55e',
  reconnecting: '#f59e0b',
  disconnected: '#ef4444',
};

/**
 * Small colored dot that reflects the WebSocket connection status.
 * Green = connected, amber = reconnecting, red = disconnected.
 */
export function WsStatusDot() {
  const status = useWsStatus();
  return (
    <View style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
