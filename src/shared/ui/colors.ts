export const colors = {
  // Brand — verde TracKing (alineado con frontend)
  primary: '#1A6B3C',
  primaryLight: '#4CAF7D',
  primaryDark: '#145530',
  primaryBg: '#E8F5EE',

  // Semantic states
  success: '#22C55E',
  successBg: '#DCFCE7',
  successText: '#15803D',

  warning: '#F6AD55',
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  danger: '#E53E3E',
  dangerBg: '#FEE2E2',
  dangerText: '#B91C1C',

  info: '#6366F1',
  infoBg: '#EEF2FF',
  infoText: '#4338CA',

  // Neutrals
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral800: '#1F2937',
  neutral900: '#111827',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background & surfaces
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
