import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { PhoneActions } from './PhoneActions';

interface ContactsMenuProps {
  /** Phone of the customer who placed the order (origin side) */
  customerPhone?: string;
  /** Name of the customer who placed the order */
  customerName?: string;
  /** Phone of the person receiving the package (destination side) */
  recipientPhone?: string;
  /** Name of the person receiving the package */
  recipientName?: string;
  /** Stop tap events from bubbling to the parent card */
  stopPropagation?: boolean;
}

/**
 * Hamburger button (≡) that opens a bottom sheet with two contact sections:
 *   👤 Cliente     — the person who placed the order (origin_contact_phone)
 *   📦 Quien recibe — the person receiving the package (destination_contact_number)
 *
 * Only renders if at least one phone number is available.
 * Each section shows PhoneActions (copy / call / WhatsApp).
 */
export function ContactsMenu({
  customerPhone,
  customerName = 'Cliente',
  recipientPhone,
  recipientName = 'Quien recibe',
  stopPropagation = false,
}: ContactsMenuProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  // Don't render the button if there are no phones at all
  if (!customerPhone && !recipientPhone) return null;

  const open = (e?: any) => {
    if (stopPropagation) e?.stopPropagation?.();
    setVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.primaryBg }]}
        activeOpacity={0.7}
        onPress={open}
      >
        <Text style={[styles.triggerIcon, { color: colors.primary }]}>☰</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.black + '73' }]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.neutral800 }]}>Contactos</Text>

            {/* ── Customer (placed the order) ── */}
            {customerPhone && (
              <View style={[styles.section, { borderColor: colors.neutral100 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>👤</Text>
                  <View>
                    <Text style={[styles.sectionRole, { color: colors.neutral500 }]}>Cliente</Text>
                    <Text style={[styles.sectionName, { color: colors.neutral800 }]}>{customerName}</Text>
                  </View>
                </View>
                <PhoneActions phone={customerPhone} showLabel />
              </View>
            )}

            {/* ── Recipient (receives the package) ── */}
            {recipientPhone && (
              <View style={[styles.section, { borderColor: colors.neutral100 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>📦</Text>
                  <View>
                    <Text style={[styles.sectionRole, { color: colors.neutral500 }]}>Quien recibe</Text>
                    <Text style={[styles.sectionName, { color: colors.neutral800 }]}>{recipientName}</Text>
                  </View>
                </View>
                <PhoneActions phone={recipientPhone} showLabel />
              </View>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: colors.neutral400 }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIcon: { fontSize: 18, lineHeight: 20 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  section: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionIcon: { fontSize: 22 },
  sectionRole: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  closeBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  closeText: { fontSize: fontSize.sm },
});
