import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useSessionRestore } from '@/core/hooks/useSessionRestore';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useTheme } from '@/shared/ui/useTheme';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isRestoring } = useSessionRestore();
  const { colors } = useTheme();
  
  // Request permissions on app start
  usePermissions();

  if (isRestoring) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // contentStyle picks up NavigationContainer theme.colors.background automatically,
        // but we set it explicitly so Stack screens never flash white
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
