import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { StatusBadge } from '@/features/services/components/StatusBadge';
import { ContactsMenu } from '@/features/services/components/ContactsMenu';
import { useServices } from '@/features/services/hooks/useServices';
import type { Service } from '@/features/services/types/services.types';

interface ActiveServiceCardProps {
  service: Service;
  onPress?: () => void;
  onNavigate?: () => void;
  onViewDetails?: (serviceId: string) => void;
}

export function ActiveServiceCard({ service, onPress, onNavigate, onViewDetails }: ActiveServiceCardProps) {
  const { colors } = useTheme();
  const { performAction, actionLoading } = useServices();
  const [error, setError] = useState<string | null>(null);

  const getButtonLabel = () => {
    switch (service.status) {
      case 'ASSIGNED':
        return 'ACEPTAR';
      case 'ACCEPTED':
        return 'INICIAR RUTA';
      case 'IN_TRANSIT':
        return 'ENTREGAR';
      default:
        return null;
    }
  };

  const handleCardPress = () => {
    onViewDetails?.(service.id) || onPress?.();
  };

  const handleAction = async (e: any) => {
    e.stopPropagation?.();
    const result = await performAction(service);
    if (!result.ok) {
      setError(result.error ?? 'Error desconocido');
      Alert.alert('Error', result.error ?? 'No se pudo actualizar el servicio');
    }
  };

  const buttonLabel = getButtonLabel();
  const isLoading = actionLoading === service.id;
  const hasContacts = !!(service.origin_contact_phone || service.destination_contact_number);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.black }, shadows.md]}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <View style={styles.topRow}>
        <StatusBadge status={service.status} />
        <Text style={[styles.orderId, { color: colors.neutral500 }]}>
          #{service.id.slice(-4).toUpperCase()}
        </Text>
        {hasContacts && (
          <View style={styles.menuWrap}>
            <ContactsMenu
              customerPhone={service.origin_contact_phone}
              recipientPhone={service.destination_contact_number}
              recipientName={service.destination_name}
              stopPropagation
            />
          </View>
        )}
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
        {buttonLabel && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleAction}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.white }]}>
                {buttonLabel}
              </Text>
            )}
          </TouchableOpacity>
        )}
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
  menuWrap: { marginLeft: 'auto' },
  route: { marginBottom: spacing.lg },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dotDest: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  connector: { width: 1.5, height: 16, marginLeft: 4, marginVertical: 2 },
  routeTextBlock: { flex: 1 },
  routeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: 2 },
  routeAddress: { fontSize: fontSize.sm },
  routeAddressBold: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  clientName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  clientSub: { fontSize: fontSize.xs },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
