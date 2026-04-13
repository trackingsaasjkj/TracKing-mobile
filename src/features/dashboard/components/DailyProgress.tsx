import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';

interface DailyProgressProps {
  completed: number;
  total: number;
}

export function DailyProgress({ completed, total }: DailyProgressProps) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.min(completed / total, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.neutral800 }]}>Progreso diario</Text>
        <Text style={[styles.count, { color: colors.neutral500 }]}>
          <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
            {completed}/{total}
          </Text>{' '}
          Completados
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.neutral200 }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  count: { fontSize: fontSize.sm },
  track: { height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.full },
});
