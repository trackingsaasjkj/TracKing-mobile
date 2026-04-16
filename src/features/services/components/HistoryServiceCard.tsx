import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { StatusBadge } from './StatusBadge';
import type { Service } from '../types/services.types';

interface HistoryServiceCardProps {
  service: Service;
  onPress: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export function HistoryServiceCard({ service, onPress }: HistoryServiceCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row: status + order id + date */}
      <View style={styles.topRow}>
        <StatusBadge status={service.status} />
        <Text style={[styles.orderId, { color: colors.neutral500 }]}>
          #{service.id.slice(-6).toUpperCase()}
        </Text>
        <Text style={[styles.date, { color: colors.neutral400 }]}>
          {formatDate(service.delivery_date ?? service.created_at)}
        </Text>
      </View>

      {/* Destination */}
      <View style={styles.destRow}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={styles.destInfo}>
          <Text style={[styles.destName, { color: colors.neutral900 }]} numberOfLines={1}>
            {service.destination_name}
          </Text>
          <Text style={[styles.destAddress, { color: colors.neutral500 }]} numberOfLines={1}>
            {service.destination_address}
          </Text>
        </View>
      </View>

      {/* Footer: payment + price */}
      <View style={[styles.footer, { borderTopColor: colors.neutral100 }]}>
        <View style={[styles.paymentBadge, { backgroundColor: colors.neutral100 }]}>
          <Text style={[styles.paymentText, { color: colors.neutral600 }]}>
            {PAYMENT_LABEL[service.payment_method] ?? service.payment_method}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.neutral900 }]}>
          {formatCurrency(service.total_price)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  date: {
    fontSize: fontSize.xs,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  destInfo: { flex: 1 },
  destName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  destAddress: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  paymentBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  paymentText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
