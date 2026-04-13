import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing } from '@/shared/ui/spacing';
import type { OperationalStatus } from '@/features/auth/types/auth.types';

interface HeaderProps {
  name: string;
  status: OperationalStatus;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

export function Header({ name, status }: HeaderProps) {
  const { colors } = useTheme();
  const isOnline = status === 'AVAILABLE';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.left}>
        <Text style={[styles.greeting, { color: colors.neutral900 }]}>Hola, {name}</Text>
        <Text style={[styles.date, { color: colors.neutral500 }]}>Hoy, {getFormattedDate()}</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={[styles.notifBtn, { backgroundColor: colors.neutral100 }]} activeOpacity={0.7}>
          <Text style={styles.notifIcon}>🔔</Text>
          <View style={[styles.notifDot, { backgroundColor: colors.danger, borderColor: colors.white }]} />
        </TouchableOpacity>
        <View
          style={[
            styles.avatar,
            isOnline
              ? { backgroundColor: colors.primaryBg, borderColor: colors.primary }
              : { backgroundColor: colors.neutral100, borderColor: colors.neutral200 },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  left: { flex: 1 },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  date: { fontSize: fontSize.sm, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4, borderWidth: 1.5,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
