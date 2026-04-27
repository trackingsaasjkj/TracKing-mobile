export const darkColors = {
  // Brand — azul TracKing dark mode
  primary:      '#60A5FA',  // blue-400 — frontend primary.light, vibrante en dark
  primaryLight: '#93C5FD',  // blue-300 — frontend accent
  primaryDark:  '#1D4ED8',  // blue-700
  primaryBg:    '#0D1B3E',  // fondo azul oscuro para tarjetas

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

  // Background & surfaces — frontend dark: neutral-950
  background:   '#0A0F1E',
  surface:      '#111827',
  surfaceRaised: '#1A2235',
} as const;

export type DarkColorKey = keyof typeof darkColors;
