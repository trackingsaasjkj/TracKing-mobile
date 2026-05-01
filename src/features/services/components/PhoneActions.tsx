import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Clipboard, Alert,
} from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';

interface PhoneActionsProps {
  phone: string;
  /** Show the phone number as a label above the action buttons */
  showLabel?: boolean;
}

/**
 * Renders three quick-action buttons for a phone number:
 *   📋 Copy   — copies the number to clipboard
 *   📞 Call   — opens the native dialer
 *   💬 WhatsApp — opens WhatsApp chat (wa.me deep link)
 *
 * Strips all non-digit characters before building URLs so numbers
 * like "+57 310 123 4567" or "310-123-4567" work correctly.
 */
export function PhoneActions({ phone, showLabel = true }: PhoneActionsProps) {
  const { colors } = useTheme();

  // Keep only digits and leading + for international format
  const clean = phone.replace(/[^\d+]/g, '');

  const handleCopy = () => {
    Clipboard.setString(phone);
    Alert.alert('Copiado', `${phone} copiado al portapapeles`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${clean}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el marcador telefónico'),
    );
  };

  const handleWhatsApp = () => {
    // wa.me expects digits only, no + prefix
    const digits = clean.replace(/^\+/, '');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir WhatsApp'),
    );
  };

  return (
    <View style={styles.wrapper}>
      {showLabel && (
        <Text style={[styles.phoneLabel, { color: colors.neutral600 }]}>{phone}</Text>
      )}
      <View style={styles.row}>
        <ActionBtn icon="📋" label="Copiar" onPress={handleCopy} bg={colors.neutral100} color={colors.neutral700} />
        <ActionBtn icon="📞" label="Llamar" onPress={handleCall} bg={colors.primaryBg} color={colors.primary} />
        <ActionBtn icon="💬" label="WhatsApp" onPress={handleWhatsApp} bg="#E7F9EE" color="#25D366" />
      </View>
    </View>
  );
}

function ActionBtn({
  icon, label, onPress, bg, color,
}: {
  icon: string; label: string; onPress: () => void; bg: string; color: string;
}) {
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.btnIcon}>{icon}</Text>
      <Text style={[styles.btnLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  phoneLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  btnIcon: { fontSize: 14 },
  btnLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
