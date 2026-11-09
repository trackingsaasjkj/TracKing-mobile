import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { borderRadius, spacing } from '@/shared/ui/spacing';

export interface SheetServiceItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  meta?: string;
  selected: boolean;
  onPress: () => void;
}

/** Compact, selectable row used inside the Home services bottom sheet. */
export function SheetServiceItem({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  meta,
  selected,
  onPress,
}: SheetServiceItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.row,
        {
          backgroundColor: selected ? colors.primaryBg : colors.surface,
          borderColor: selected ? colors.primary : colors.neutral100,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.neutral900 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: colors.neutral500 }]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Text
          style={[styles.subtitle, { color: colors.neutral500 }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.check,
          {
            backgroundColor: selected ? colors.primary : colors.neutral100,
          },
        ]}
      >
        <Ionicons
          name={selected ? 'checkmark' : 'chevron-forward'}
          size={14}
          color={selected ? colors.white : colors.neutral500}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  meta: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginLeft: 'auto',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
