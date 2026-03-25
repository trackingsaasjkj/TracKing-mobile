export const colors = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral800: '#1F2937',
} as const;

export type ColorKey = keyof typeof colors;
