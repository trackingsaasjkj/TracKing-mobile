export const darkColors = {
  // Brand — verde TracKing dark mode
  primary:      '#4CAF7D', // verde claro vibrante para dark
  primaryLight: '#A8E6C3', // accent verde pastel
  primaryDark:  '#1A6B3C', // verde profundo
  primaryBg:    '#0D2B1A', // fondo verde oscuro para tarjetas

  // Semantic states
  success:      '#22C55E',
  successBg:    '#052E16',
  successText:  '#86EFAC',

  warning:      '#F6AD55',
  warningBg:    '#451A03',
  warningText:  '#FDE047',

  danger:       '#F87171',
  dangerBg:     '#450A0A',
  dangerText:   '#FECACA',

  info:         '#8B5CF6',
  infoBg:       '#2E1065',
  infoText:     '#DDD6FE',

  // Neutrals (Slate/Navy)
  neutral50:    '#F8FAFC',
  neutral100:   '#E2E8F0',
  neutral200:   '#94A3B8',
  neutral400:   '#64748B',
  neutral500:   '#94A3B8',
  neutral600:   '#334155',
  neutral800:   '#E2E8F0',
  neutral900:   '#F8FAFC',

  // Base
  white:        '#FFFFFF',
  black:        '#000000',
  transparent:  'transparent',

  // Background & surfaces
  background:   '#0B121E',
  surface:      '#131F2E',
  surfaceRaised: '#1A2840',
} as const;

export type DarkColorKey = keyof typeof darkColors;
