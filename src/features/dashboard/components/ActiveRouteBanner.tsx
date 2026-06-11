import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'

interface ActiveRouteBannerProps {
  totalStops: number
  completedStops: number
  onPress: () => void
}

export function ActiveRouteBanner({ totalStops, completedStops, onPress }: ActiveRouteBannerProps) {
  const { colors } = useTheme()
  const remaining = totalStops - completedStops
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left icon */}
      <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
        <Ionicons name="git-branch-outline" size={20} color={colors.white} />
      </View>

      {/* Text info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.primary }]}>Ruta activa en curso</Text>
        <Text style={[styles.subtitle, { color: colors.primaryDark }]}>
          {completedStops > 0
            ? `${completedStops} de ${totalStops} paradas completadas`
            : `${remaining} parada${remaining !== 1 ? 's' : ''} pendiente${remaining !== 1 ? 's' : ''}`}
        </Text>

        {/* Progress bar */}
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

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.xs },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
})
