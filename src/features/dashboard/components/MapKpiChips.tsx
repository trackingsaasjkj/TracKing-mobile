import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { borderRadius, spacing } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';

interface MapKpiChipsProps {
  pending: number;
  inTransit: number;
  earnings: number;
}

interface ChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  accentBg: string;
}

function Chip({ icon, label, value, accent, accentBg }: ChipProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.overlaySurface,
          shadowColor: colors.black,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
        <Ionicons name={icon} size={13} color={accent} />
      </View>
      <View>
        <Text style={[styles.value, { color: colors.neutral900 }]}>{value}</Text>
        <Text style={[styles.label, { color: colors.neutral500 }]}>{label}</Text>
      </View>
    </View>
  );
}

/** Compact KPI pills that float over the map, below the header. */
export function MapKpiChips({ pending, inTransit, earnings }: MapKpiChipsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Chip
        icon="clipboard-outline"
        label="Pendientes"
        value={String(pending)}
        accent={colors.warningText}
        accentBg={colors.warningBg}
      />
      <Chip
        icon="bicycle-outline"
        label="En ruta"
        value={String(inTransit)}
        accent={colors.primary}
        accentBg={colors.primaryBg}
      />
      <Chip
        icon="wallet-outline"
        label="Hoy"
        value={`$${earnings.toFixed(0)}`}
        accent={colors.successText}
        accentBg={colors.successBg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
});
