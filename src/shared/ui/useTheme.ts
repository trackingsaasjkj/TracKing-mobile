import { useThemeStore } from './theme.store';

/**
 * Primary hook for consuming the active theme.
 *
 * Usage:
 *   const { colors, isDark, toggle } = useTheme();
 *
 * `colors` is always the active palette (light or dark).
 * Components must use this hook instead of importing `colors` statically —
 * static imports freeze at module load time and never react to theme changes.
 */
export function useTheme() {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const mode = useThemeStore((s) => s.mode);
  const isHydrated = useThemeStore((s) => s.isHydrated);
  const toggle = useThemeStore((s) => s.toggle);
  const setMode = useThemeStore((s) => s.setMode);

  return { colors, isDark, mode, isHydrated, toggle, setMode };
}
