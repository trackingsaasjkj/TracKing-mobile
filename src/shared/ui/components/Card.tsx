import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../useTheme';
import { borderRadius, spacing } from '../spacing';
import { shadows } from '../shadows';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  padding?: number;
}

export function Card({ children, style, shadow = 'sm', padding = spacing.lg }: CardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, shadows[shadow], { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
});
