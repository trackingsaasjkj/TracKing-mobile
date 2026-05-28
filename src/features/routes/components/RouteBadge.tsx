import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'

interface RouteBadgeProps {
  completedStops?: number
  totalStops: number
  onPress: () => void
}

export function RouteBadge({ completedStops, totalStops, onPress }: RouteBadgeProps) {
  const { colors } = useTheme()
  const label = completedStops !== undefined
    ? `Ruta: ${completedStops}/${totalStops}`
    : 'Ver ruta'

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
      <Text style={[styles.text, { color: colors.primary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={12} color={colors.primary} />
    </TouchableOpacity>
  )
}

export function RouteActiveBanner({ completedStops = 0, totalStops, onPress }: RouteBadgeProps) {
  const { colors } = useTheme()
  const remaining = totalStops - completedStops

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name="git-branch-outline" size={20} color={colors.primary} />
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color: colors.primary }]}>Ruta activa</Text>
        <Text style={[styles.bannerSub, { color: colors.primaryDark }]}>
          {remaining} parada{remaining !== 1 ? 's' : ''} pendiente{remaining !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  bannerSub: { fontSize: fontSize.xs, marginTop: 1 },
})
