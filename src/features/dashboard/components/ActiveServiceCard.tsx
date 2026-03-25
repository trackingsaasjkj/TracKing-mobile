import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';

interface ActiveServiceCardProps {
  service: Service;
  onPress?: () => void;
}

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ASSIGNED: 'Asignado',
  ACCEPTED: 'Aceptado',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
};

const STATUS_COLOR: Record<ServiceStatus, string> = {
  ASSIGNED: colors.warning,
  ACCEPTED: colors.primary,
  IN_TRANSIT: colors.primaryLight,
  DELIVERED: colors.success,
};

export function ActiveServiceCard({ service, onPress }: ActiveServiceCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.title}>Servicio activo</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[service.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[service.status] }]}>
            {STATUS_LABEL[service.status]}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.addressRow}>
        <View style={styles.dot} />
        <Text style={styles.address} numberOfLines={1}>{service.origin_address}</Text>
      </View>
      <View style={styles.addressRow}>
        <View style={[styles.dot, styles.dotDest]} />
        <Text style={styles.address} numberOfLines={1}>{service.destination_address}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.recipient}>{service.destination_name}</Text>
        <Text style={styles.price}>${service.delivery_price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.neutral800,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dotDest: {
    backgroundColor: colors.danger,
  },
  address: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  recipient: {
    fontSize: fontSize.sm,
    color: '#6B7280',
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
});
