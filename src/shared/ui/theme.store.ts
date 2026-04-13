import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { colors } from './colors';
import { darkColors } from './darkColors';

const THEME_KEY = 'app_theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  colors: typeof colors;
  isDark: boolean;
  /** True once the persisted theme has been read from storage */
  isHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  colors: colors,
  isDark: false,
  isHydrated: false,

  setMode: (mode: ThemeMode) => {
    const next = mode === 'dark' ? darkColors : colors;
    SecureStore.setItemAsync(THEME_KEY, mode).catch(() => null);
    set({ mode, colors: next as typeof colors, isDark: mode === 'dark' });
  },

  toggle: () => {
    const next = get().mode === 'light' ? 'dark' : 'light';
    get().setMode(next);
  },

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      if (stored === 'dark' || stored === 'light') {
        get().setMode(stored);
      }
    } catch {
      // fallback to light — no-op
    } finally {
      set({ isHydrated: true });
    }
  },
}));
