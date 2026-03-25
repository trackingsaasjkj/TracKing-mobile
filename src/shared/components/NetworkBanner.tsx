import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/core/hooks/useNetworkStatus';
import { colors } from '../ui/colors';
import { fontSize } from '../ui/typography';

export function NetworkBanner() {
  const isConnected = useNetworkStatus();

  if (isConnected !== false) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
