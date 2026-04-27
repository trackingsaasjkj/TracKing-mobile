export const colors = {
  // Brand — azul TracKing (alineado con frontend)
  primary: '#1D4ED8',       // blue-700 — frontend primary.DEFAULT
  primaryLight: '#60A5FA',  // blue-400 — frontend primary.light
  primaryDark: '#1E40AF',   // blue-800
  primaryBg: '#EFF6FF',     // blue-50  — frontend primary.pale

  // Semantic states
  success: '#22C55E',
  successBg: '#DCFCE7',
  successText: '#15803D',

  warning: '#F6AD55',       // frontend warning
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  danger: '#E53E3E',        // frontend danger
  dangerBg: '#FEE2E2',
  dangerText: '#B91C1C',

  info: '#6366F1',
  infoBg: '#EEF2FF',
  infoText: '#4338CA',

  // Neutrals — frontend neutral scale
  neutral50: '#F9FAFB',     // frontend neutral.50
  neutral100: '#F3F4F6',    // frontend neutral.100
  neutral200: '#E5E7EB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral800: '#1F2937',    // frontend neutral.800
  neutral900: '#111827',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background & surfaces
  background: '#F9FAFB',    // frontend body bg (neutral-50)
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
