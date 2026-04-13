import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/core/hooks/useNetworkStatus';
import { useTheme } from '../ui/useTheme';
import { fontSize, fontWeight } from '../ui/typography';

export function NetworkBanner() {
  const isConnected = useNetworkStatus();
  const { colors } = useTheme();

  if (isConnected !== false) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Text style={[styles.text, { color: colors.white }]}>Sin conexión a internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
