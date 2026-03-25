import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';

interface KPIBoxProps {
  label: string;
  value: string | number;
  accent?: string;
}

export function KPIBox({ label, value, accent = colors.primary }: KPIBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  label: {
    fontSize: fontSize.xs,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
