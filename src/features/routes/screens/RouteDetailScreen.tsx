import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ErrorState } from '@/shared/components/ErrorState'
import { useActiveRoute } from '../hooks/useActiveRoute'
import { useCompleteStop } from '../hooks/useCompleteStop'
import { RouteStopItem } from '../components/RouteStopItem'
import { RouteMap } from '../components/RouteMap'
import type { StopCompletionData } from '../components/CompleteStopModal'

type RouteParams = { routeId?: string }
type Nav = NativeStackNavigationProp<any>

function Row({ label, value, highlight, colors }: { label: string; value: string | number; highlight?: boolean; colors: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.neutral500 }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: highlight ? colors.danger : colors.neutral900 },
          highlight && styles.rowValueBold,
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  )
}

export function RouteDetailScreen() {
  const route = useRoute<NativeStackScreenProps<any, any>['route']>()
  const navigation = useNavigation<Nav>()
  const { colors } = useTheme()
  const routeId = (route.params as RouteParams)?.routeId
  const { route: activeRoute, isLoading, isError, error, refresh } = useActiveRoute(routeId)
  const { execute: completeStop } = useCompleteStop()

  const handleCompleted = async (stopId: string, data: StopCompletionData) => {
    if (!activeRoute) return
    const result = await completeStop(activeRoute.id, stopId, data)
    if (!result.ok) throw new Error(result.error ?? 'Error al completar la parada')
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message={error ?? 'Error al cargar la ruta'} onRetry={refresh} />
  if (!activeRoute) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Ionicons name="git-branch-outline" size={48} color={colors.neutral200} />
          <Text style={[styles.emptyTitle, { color: colors.neutral500 }]}>Sin ruta activa</Text>
          <Text style={[styles.emptySub, { color: colors.neutral400 }]}>
            No tienes una ruta asignada en este momento
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Calculate derived values safely
  const stops = Array.isArray(activeRoute?.stops) ? activeRoute.stops : []
  const activeIndex = stops.findIndex((s) => s?.status === 'PENDING')
  const isRouteComplete = stops.length > 0 && stops.every((s) => s.status === 'COMPLETED')
  const completedStops = stops.filter((s) => s.status === 'COMPLETED').length
  const progress = stops.length > 0 ? (completedStops / stops.length) * 100 : 0
  const routeTypeLabel = activeRoute.route_type === 'DISTRIBUTION' ? 'Distribución' : 'Recolección'

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    PLANNED: { label: 'Planificada', color: colors.warningText, bg: colors.warningBg },
    IN_PROGRESS: { label: 'En curso', color: colors.primaryDark, bg: colors.primaryBg },
    COMPLETED: { label: 'Completada', color: colors.successText, bg: colors.successBg },
    CANCELLED: { label: 'Cancelada', color: colors.dangerText, bg: colors.dangerBg },
  }

  const status = (activeRoute.status && statusConfig[activeRoute.status]) || statusConfig.PLANNED

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={refresh} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: colors.neutral100 }]}>
            <Text style={[styles.typeText, { color: colors.neutral600 }]}>{routeTypeLabel}</Text>
          </View>
        </View>

        {/* Map — shows all stops, active stop highlighted, courier position live */}
        {stops.length > 0 && (
          <View style={styles.mapContainer}>
            <RouteMap stops={stops} activeStopIndex={activeIndex >= 0 ? activeIndex : 0} />
          </View>
        )}

        {/* Route Info Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.neutral500 }]}>Información de la Ruta</Text>
          <Row label="ID de Ruta" value={activeRoute.id.slice(0, 8).toUpperCase()} colors={colors} />
          <Row label="Total de Paradas" value={stops.length} colors={colors} />
          <Row label="Distancia Estimada" value={`${activeRoute.estimated_distance.toFixed(1)} km`} colors={colors} />
          <Row label="Tiempo Estimado" value={`${activeRoute.estimated_time_minutes} min`} colors={colors} />
        </View>

        {/* Progress Section */}
        {activeRoute.status === 'PLANNED' || activeRoute.status === 'IN_PROGRESS' ? (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.neutral500 }]}>Progreso</Text>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressText, { color: colors.neutral600 }]}>Paradas completadas</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>
                {completedStops}/{stops.length}
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

        {/* Complete Banner */}
        {isRouteComplete ? (
          <View style={[styles.completeBanner, { backgroundColor: colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.completeText, { color: colors.successText }]}>
              ¡Ruta completada! Todas las paradas fueron entregadas.
            </Text>
          </View>
        ) : null}

        {/* Stops List */}
        <View style={styles.stopsSection}>
          <Text style={[styles.sectionTitle, { color: colors.neutral500, marginBottom: spacing.md }]}>Paradas</Text>
          {stops.length === 0 ? (
            <Text style={[styles.emptyTitle, { color: colors.neutral500 }]}>Sin paradas en esta ruta</Text>
          ) : (
            stops.map((stop, index) => (
              <RouteStopItem
                key={stop.id}
                stop={stop}
                isActive={index === activeIndex}
                isLast={index === stops.length - 1}
                routeId={activeRoute.id}
                onCompleted={handleCompleted}
              />
            ))
          )}
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  mapContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backIcon: { fontSize: 24, fontWeight: fontWeight.bold },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  rowValueBold: {
    fontWeight: fontWeight.bold,
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
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  completeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  stopsSection: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.huge,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySub: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
})
