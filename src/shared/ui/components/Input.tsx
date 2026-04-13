import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../useTheme';
import { fontSize, fontWeight } from '../typography';
import { borderRadius, spacing } from '../spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.neutral800 }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.neutral200 },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, { color: colors.neutral800 }, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={colors.neutral400}
          {...rest}
        />
        {rightIcon ? (
          <TouchableOpacity style={styles.iconRight} onPress={onRightIconPress} activeOpacity={0.7}>
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
  },
  inputWithLeft: { paddingLeft: spacing.sm },
  iconLeft: { paddingLeft: spacing.lg },
  iconRight: { paddingRight: spacing.lg },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
