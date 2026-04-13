import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { StatusBadge } from '@/features/services/components/StatusBadge';
import type { Service } from '@/features/services/types/services.types';

interface ActiveServiceCardProps {
  service: Service;
  onPress?: () => void;
  onNavigate?: () => void;
}

export function ActiveServiceCard({ service, onPress, onNavigate }: ActiveServiceCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.black }, shadows.md]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.topRow}>
        <StatusBadge status={service.status} />
        <Text style={[styles.orderId, { color: colors.neutral500 }]}>
          #{service.id.slice(-4).toUpperCase()}
        </Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.dotOrigin, { backgroundColor: colors.neutral400 }]} />
          <View style={styles.routeTextBlock}>
            <Text style={[styles.routeLabel, { color: colors.neutral400 }]}>RECOGIDA</Text>
            <Text style={[styles.routeAddress, { color: colors.neutral600 }]} numberOfLines={1}>
              {service.origin_address}
            </Text>
          </View>
        </View>
        <View style={[styles.connector, { backgroundColor: colors.neutral200 }]} />
        <View style={styles.routeRow}>
          <View style={[styles.dotDest, { backgroundColor: colors.primary }]} />
          <View style={styles.routeTextBlock}>
            <Text style={[styles.routeLabel, { color: colors.primary }]}>ENTREGA</Text>
            <Text style={[styles.routeAddressBold, { color: colors.neutral900 }]} numberOfLines={1}>
              {service.destination_address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.clientRow}>
          <View style={[styles.clientAvatar, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.clientInitial, { color: colors.primary }]}>
              {service.destination_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.clientName, { color: colors.neutral800 }]}>
              {service.destination_name}
            </Text>
            <Text style={[styles.clientSub, { color: colors.neutral500 }]}>
              {service.payment_method}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.neutral100 }]} activeOpacity={0.7}>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navigateBtn, { backgroundColor: colors.primary }]}
            onPress={onNavigate}
            activeOpacity={0.85}
          >
            <Text style={styles.navigateIcon}>🗺</Text>
            <Text style={[styles.navigateText, { color: colors.white }]}>Navegar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1.5,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  orderId: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  route: { marginBottom: spacing.lg },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dotDest: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  connector: { width: 1.5, height: 16, marginLeft: 4, marginVertical: 2 },
  routeTextBlock: { flex: 1 },
  routeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: 2 },
  routeAddress: { fontSize: fontSize.sm },
  routeAddressBold: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  clientName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  clientSub: { fontSize: fontSize.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  callBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 18 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs,
  },
  navigateIcon: { fontSize: 14 },
  navigateText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
