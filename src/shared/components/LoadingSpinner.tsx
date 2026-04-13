import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../ui/useTheme';

export function LoadingSpinner() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
