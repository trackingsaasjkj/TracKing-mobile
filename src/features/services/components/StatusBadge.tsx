import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import type { ServiceStatus } from '../types/services.types';

const CONFIG: Record<ServiceStatus, { label: string; bg: string; text: string }> = {
  ASSIGNED:  { label: 'Asignado',    bg: '#FEF3C7', text: '#92400E' },
  ACCEPTED:  { label: 'Aceptado',    bg: '#DBEAFE', text: '#1E40AF' },
  IN_TRANSIT:{ label: 'En tránsito', bg: '#EDE9FE', text: '#5B21B6' },
  DELIVERED: { label: 'Entregado',   bg: '#DCFCE7', text: '#15803D' },
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const { label, bg, text } = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
