import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import type { Route } from '../types/routes.types'

interface RouteHeaderProps {
  route: Route
}

export function RouteHeader({ route }: RouteHeaderProps) {
  const { colors } = useTheme()
  
  // Defensive checks for undefined/null data
  if (!route) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statusText, { color: colors.neutral500 }]}>
          Cargando ruta...
        </Text>
      </View>
    )
  }

  const stops = Array.isArray(route.stops) ? route.stops : []
  const completedStops = stops.filter((s) => s && s.status === 'COMPLETED').length
  const progress = (route.total_stops ?? 0) > 0 ? (completedStops / (route.total_stops ?? 1)) * 100 : 0
  const routeTypeLabel = route.route_type === 'DISTRIBUTION' ? 'Distribución' : 'Recolección'

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED: { label: 'Planificada', color: colors.warningText, bg: colors.warningBg },
    IN_PROGRESS: { label: 'En curso', color: colors.primaryDark, bg: colors.primaryBg },
    COMPLETED: { label: 'Completada', color: colors.successText, bg: colors.successBg },
    CANCELLED: { label: 'Cancelada', color: colors.dangerText, bg: colors.dangerBg },
  }

  const status = statusConfig[route.status] ?? statusConfig.PLANNED

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: colors.neutral100 }]}>
          <Text style={[styles.typeText, { color: colors.neutral600 }]}>{routeTypeLabel}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="location-outline" size={16} color={colors.neutral500} />
          <Text style={[styles.statValue, { color: colors.neutral900 }]}>{route.total_stops}</Text>
          <Text style={[styles.statLabel, { color: colors.neutral500 }]}>Paradas</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="speedometer-outline" size={16} color={colors.neutral500} />
          <Text style={[styles.statValue, { color: colors.neutral900 }]}>
            {route.estimated_distance.toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.neutral500 }]}>km</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={16} color={colors.neutral500} />
          <Text style={[styles.statValue, { color: colors.neutral900 }]}>
            {route.estimated_time_minutes}
          </Text>
          <Text style={[styles.statLabel, { color: colors.neutral500 }]}>min</Text>
        </View>
      </View>

      {route.status === 'PLANNED' || route.status === 'IN_PROGRESS' ? (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressText, { color: colors.neutral600 }]}>Progreso</Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {completedStops}/{route.total_stops}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.neutral200 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: progress === 100 ? colors.success : colors.primary,
                  width: `${Math.min(progress, 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  progressPercent: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
})
