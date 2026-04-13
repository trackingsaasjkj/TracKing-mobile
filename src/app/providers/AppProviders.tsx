import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NetworkBanner } from '@/shared/components/NetworkBanner';
import { useThemeStore } from '@/shared/ui/theme.store';
import { lightNavigationTheme, darkNavigationTheme } from '@/shared/ui/navigationTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const hydrate = useThemeStore((s) => s.hydrate);
  const isHydrated = useThemeStore((s) => s.isHydrated);
  const isDark = useThemeStore((s) => s.isDark);
  const themeColors = useThemeStore((s) => s.colors);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Block render until persisted theme is loaded — prevents light→dark flash
  // Note: uses themeColors from store directly since useTheme() is not available before hydration
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={themeColors.primary} />
      </View>
    );
  }

  const navTheme = isDark ? darkNavigationTheme : lightNavigationTheme;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/*
          theme prop propagates to:
          - NavigationContainer background
          - Stack screen backgrounds
          - Tab bar (overridden per-navigator for fine control)
          - Modal overlays
          - Header backgrounds (overridden per-navigator)
        */}
        <NavigationContainer theme={navTheme}>
          <NetworkBanner />
          {children}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
