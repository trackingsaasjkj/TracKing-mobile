import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { StatusBadge } from './StatusBadge';
import type { Service } from '../types/services.types';

interface ServiceCardProps {
  service: Service;
  onPress: () => void;
}

export function ServiceCard({ service, onPress }: ServiceCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.recipient} numberOfLines={1}>{service.destination_name}</Text>
        <StatusBadge status={service.status} />
      </View>

      <View style={styles.addressBlock}>
        <View style={styles.addressRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.address} numberOfLines={1}>{service.origin_address}</Text>
        </View>
        <View style={styles.addressRow}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={styles.address} numberOfLines={1}>{service.destination_address}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.payment}>{service.payment_method}</Text>
        <Text style={styles.price}>${service.delivery_price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recipient: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.neutral800,
    marginRight: 8,
  },
  addressBlock: { gap: 6, marginBottom: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  address: { flex: 1, fontSize: fontSize.sm, color: '#374151' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  payment: { fontSize: fontSize.xs, color: '#6B7280' },
  price: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success },
});
