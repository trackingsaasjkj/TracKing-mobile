import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { Button } from '@/shared/ui/components/Button';
import { StatusBadge } from './StatusBadge';
import { ContactsMenu } from './ContactsMenu';
import type { Service } from '../types/services.types';

interface ServiceCardProps {
  service: Service;
  onPress: () => void;
  onAction?: () => void;
  actionLoading?: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Pago en efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

function useCardColors() {
  const { colors } = useTheme();
  return colors;
}

function ClientRow({ name, sub }: { name: string; sub: string }) {
  const colors = useCardColors();
  return (
    <View style={styles.clientRow}>
      <View style={[styles.clientAvatar, { backgroundColor: colors.primaryBg }]}>
        <Text style={[styles.clientInitial, { color: colors.primary }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: colors.neutral800 }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.clientSub, { color: colors.neutral500 }]}>{sub}</Text>
      </View>
    </View>
  );
}

function RouteBlock({ origin, destination }: { origin: string; destination: string }) {
  const colors = useCardColors();
  return (
    <View style={styles.route}>
      <View style={styles.routeRow}>
        <View style={[styles.dotOrigin, { backgroundColor: colors.neutral400 }]} />
        <View style={styles.routeTextBlock}>
          <Text style={[styles.routeLabel, { color: colors.neutral400 }]}>RECOGIDA</Text>
          <Text style={[styles.routeAddress, { color: colors.neutral600 }]} numberOfLines={2}>{origin}</Text>
        </View>
      </View>
      <View style={[styles.connector, { backgroundColor: colors.neutral200 }]} />
      <View style={styles.routeRow}>
        <View style={[styles.dotDest, { backgroundColor: colors.primary }]} />
        <View style={styles.routeTextBlock}>
          <Text style={[styles.routeLabel, { color: colors.primary }]}>ENTREGA</Text>
          <Text style={[styles.routeAddressDest, { color: colors.neutral900 }]} numberOfLines={2}>
            {destination}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ServiceCard({ service, onPress, onAction, actionLoading }: ServiceCardProps) {
  const { colors } = useTheme();
  const isActive = service.status === 'IN_TRANSIT' || service.status === 'ACCEPTED';
  const isCompleted = service.status === 'DELIVERED';
  const isPending = service.status === 'ASSIGNED';
  const hasContacts = !!(service.origin_contact_phone || service.destination_contact_number);

  // ── Completed ──────────────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardCompleted, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.completedRow}>
          <StatusBadge status={service.status} />
          <Text style={[styles.orderId, { color: colors.neutral500 }]}>
            #{service.id.slice(-4).toUpperCase()}
          </Text>
        </View>
        <ClientRow
          name={service.destination_name}
          sub={`${service.destination_address} • #ORD-${service.id.slice(-4).toUpperCase()}`}
        />
      </TouchableOpacity>
    );
  }

  // ── Active (ACCEPTED / IN_TRANSIT) ─────────────────────────────────────────
  if (isActive) {
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
          {hasContacts && (
            <View style={styles.menuWrap}>
              <ContactsMenu
                customerPhone={service.origin_contact_phone}
                recipientPhone={service.destination_contact_number}
                recipientName={service.destination_name}
              />
            </View>
          )}
        </View>
        <RouteBlock origin={service.origin_address} destination={service.destination_address} />
        <View style={styles.footer}>
          <ClientRow
            name={service.destination_name}
            sub={PAYMENT_LABEL[service.payment_method] ?? service.payment_method}
          />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Pending (ASSIGNED) ─────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}
      onPress={onPress}
      activeOpacity={0.88}
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
            />
          </View>
        )}
      </View>
      <RouteBlock origin={service.origin_address} destination={service.destination_address} />
      <ClientRow
        name={service.destination_name}
        sub={PAYMENT_LABEL[service.payment_method] ?? service.payment_method}
      />
      {isPending && (
        <View style={[styles.pendingActions, { borderTopColor: colors.neutral100 }]}>
          <Button label="Ver Detalles" onPress={onPress} size="sm" variant="outline" style={styles.actionBtn} />
          <Button
            label="Iniciar Ruta"
            onPress={onAction ?? onPress}
            size="sm"
            variant="primary"
            loading={actionLoading}
            style={styles.actionBtn}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardCompleted: { opacity: 0.85 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  orderId: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  menuWrap: { marginLeft: 'auto' },
  route: { marginBottom: spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dotOrigin: { width: 9, height: 9, borderRadius: 5, marginTop: 3 },
  dotDest: { width: 9, height: 9, borderRadius: 5, marginTop: 3 },
  connector: { width: 1.5, height: 14, marginLeft: 4, marginVertical: 2 },
  routeTextBlock: { flex: 1 },
  routeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.4, marginBottom: 1 },
  routeAddress: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
  routeAddressDest: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: fontSize.sm * 1.4 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  clientInfo: { flex: 1 },
  clientName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  clientSub: { fontSize: fontSize.xs, marginTop: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  pendingActions: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1,
  },
  actionBtn: { flex: 1 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
});
