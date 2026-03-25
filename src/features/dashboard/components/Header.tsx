import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import type { OperationalStatus } from '@/features/auth/types/auth.types';

interface HeaderProps {
  name: string;
  status: OperationalStatus;
}

export function Header({ name, status }: HeaderProps) {
  const isOnline = status === 'AVAILABLE';
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Hola, {name}</Text>
        <Text style={styles.role}>Mensajero</Text>
      </View>
      <View style={[styles.badge, isOnline ? styles.online : styles.offline]}>
        <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={[styles.badgeText, isOnline ? styles.textOnline : styles.textOffline]}>
          {isOnline ? 'En línea' : 'Fuera de línea'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.neutral800,
  },
  role: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  online: { backgroundColor: '#DCFCE7' },
  offline: { backgroundColor: '#F3F4F6' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: '#9CA3AF' },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  textOnline: { color: '#15803D' },
  textOffline: { color: '#6B7280' },
});
