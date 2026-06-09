import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import { Button } from '@/shared/ui/components/Button'
import type { RouteStop, RouteStopStatus } from '../types/routes.types'

interface RouteStopItemProps {
  stop: RouteStop
  isActive: boolean
  isLast: boolean
  onComplete?: () => void
  completing?: boolean
}

function StopStatusIcon({ status }: { status: RouteStopStatus }) {
  const { colors } = useTheme()
  if (status === 'COMPLETED') {
    return <Ionicons name="checkmark-circle" size={22} color={colors.success} />
  }
  return <Ionicons name="ellipse-outline" size={22} color={colors.neutral400} />
}

export function RouteStopItem({ stop, isActive, isLast, onComplete, completing }: RouteStopItemProps) {
  const { colors } = useTheme()
  
  // Defensive check
  if (!stop) {
    return null
  }
  
  const isCompleted = stop.status === 'COMPLETED'
  const isPickup = stop.stop_type === 'PICKUP'

  return (
    <View style={styles.container}>
      <View style={styles.timelineCol}>
        <StopStatusIcon status={stop.status} />
        {!isLast && (
          <View style={[styles.connector, { backgroundColor: isCompleted ? colors.success : colors.neutral200 }]} />
        )}
      </View>
      <View style={[styles.content, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: isPickup ? colors.warningBg : colors.infoBg }]}>
            <Text style={[styles.typeText, { color: isPickup ? colors.warningText : colors.infoText }]}>
              {isPickup ? 'RECOGIDA' : 'ENTREGA'}
            </Text>
          </View>
          <Text style={[styles.order, { color: colors.neutral500 }]}>
            #{stop.sequence_order}
          </Text>
        </View>

        <Text style={[styles.address, { color: colors.neutral900 }]} numberOfLines={2}>
          {stop.address}
        </Text>

        {isActive && !isCompleted && onComplete && (
          <View style={styles.actionRow}>
            <Button
              label="Completar parada"
              onPress={onComplete}
              size="sm"
              variant={isPickup ? 'outline' : 'primary'}
              loading={completing}
              fullWidth
            />
          </View>
        )}

        {isCompleted && stop.completion_time && (
          <Text style={[styles.completedAt, { color: colors.neutral400 }]}>
            Completada {new Date(stop.completion_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineCol: {
    alignItems: 'center',
    width: 28,
    paddingTop: spacing.xs,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  order: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  address: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * 1.4,
    marginBottom: spacing.xs,
  },
  actionRow: {
    marginTop: spacing.sm,
  },
  completedAt: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
})
