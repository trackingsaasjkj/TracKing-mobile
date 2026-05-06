import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, Clipboard, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';

interface PhoneActionsProps {
  phone: string;
  showLabel?: boolean;
}

export function PhoneActions({ phone, showLabel = true }: PhoneActionsProps) {
  const { colors } = useTheme();
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
        <ActionBtn
          iconName="copy-outline"
          label="Copiar"
          onPress={handleCopy}
          bg={colors.neutral100}
          color={colors.neutral700}
        />
        <ActionBtn
          iconName="call-outline"
          label="Llamar"
          onPress={handleCall}
          bg={colors.primaryBg}
          color={colors.primary}
        />
        <ActionBtn
          iconName="logo-whatsapp"
          label="WhatsApp"
          onPress={handleWhatsApp}
          bg="#E7F9EE"
          color="#25D366"
        />
      </View>
    </View>
  );
}

function ActionBtn({
  iconName, label, onPress, bg, color,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  bg: string;
  color: string;
}) {
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={iconName} size={14} color={color} />
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
  btnLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
