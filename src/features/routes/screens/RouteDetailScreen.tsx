import React, { useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing } from '@/shared/ui/spacing'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ErrorState } from '@/shared/components/ErrorState'
import { useActiveRoute } from '../hooks/useActiveRoute'
import { useCompleteStop } from '../hooks/useCompleteStop'
import { RouteHeader } from '../components/RouteHeader'
import { RouteStopItem } from '../components/RouteStopItem'
import type { RouteStop } from '../types/routes.types'

type RouteParams = { routeId?: string }
type Nav = NativeStackNavigationProp<any>

export function RouteDetailScreen() {
  const route = useRoute<NativeStackScreenProps<any, any>['route']>()
  const navigation = useNavigation<Nav>()
  const { colors } = useTheme()
  const { route: activeRoute, isLoading, isError, error, refresh } = useActiveRoute()
  const { execute: completeStop, loading: completingStop } = useCompleteStop()
  const [completingId, setCompletingId] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message={error ?? 'Error al cargar la ruta'} onRetry={refresh} />
  if (!activeRoute) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.neutral900 }]}>Ruta</Text>
          <View style={styles.headerSpacer} />
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

  const handleComplete = async (stop: RouteStop) => {
    setCompletingId(stop.id)
    try {
      const result = await completeStop(activeRoute.id, stop.id, {
        latitude: 0,
        longitude: 0,
        notes: undefined,
      })
      if (!result.ok) {
        Alert.alert('Error', result.error ?? 'No se pudo completar la parada')
      }
    } finally {
      setCompletingId(null)
    }
  }

  const activeIndex = activeRoute.stops.findIndex(
    (s) => s.status === 'PENDING',
  )

  const renderedStops = activeRoute.stops || []
  const isRouteComplete = renderedStops.every((s) => s.status === 'COMPLETED')

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.neutral900 }]}>Mi Ruta</Text>
        <TouchableOpacity onPress={refresh} activeOpacity={0.7} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isRouteComplete ? (
        <View style={[styles.completeBanner, { backgroundColor: colors.successBg }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.completeText, { color: colors.successText }]}>
            ¡Ruta completada! Todas las paradas fueron entregadas.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={renderedStops}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<RouteHeader route={activeRoute} />}
        renderItem={({ item, index }) => (
          <RouteStopItem
            stop={item}
            isActive={index === activeIndex}
            isLast={index === renderedStops.length - 1}
            onComplete={
              index === activeIndex && !isRouteComplete
                ? () => handleComplete(item)
                : undefined
            }
            completing={completingId === item.id}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.neutral500 }]}>
              Sin paradas en esta ruta
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backIcon: { fontSize: 28, fontWeight: fontWeight.bold, width: 30 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerSpacer: { width: 30 },
  refreshBtn: { padding: spacing.xs },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.huge,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  emptySub: { fontSize: fontSize.sm, textAlign: 'center' },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  completeText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
})
