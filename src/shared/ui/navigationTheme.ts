import type { Theme } from '@react-navigation/native';
import { colors } from './colors';
import { darkColors } from './darkColors';

/**
 * Maps the app's design tokens to React Navigation's Theme interface.
 * This ensures NavigationContainer, Stack headers, Tab bars, and modal
 * backgrounds all respond to the active theme automatically.
 *
 * React Navigation Theme shape:
 *   dark: boolean
 *   colors: {
 *     primary, background, card, text, border, notification
 *   }
 */
export const lightNavigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.neutral900,
    border: colors.neutral200,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export const darkNavigationTheme: Theme = {
  dark: true,
  colors: {
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.neutral50,
    border: darkColors.neutral600,
    notification: darkColors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};
