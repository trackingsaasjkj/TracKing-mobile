import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';

interface KPIBoxProps {
  label: string;
  value: string | number;
  accent?: string;
  icon?: string;
}

export function KPIBox({ label, value, accent, icon }: KPIBoxProps) {
  const { colors } = useTheme();
  const accentColor = accent ?? colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.neutral500 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
    marginHorizontal: spacing.xs,
  },
  icon: { fontSize: 20, marginBottom: spacing.sm },
  value: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, lineHeight: fontSize.xxl * 1.1 },
  label: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
