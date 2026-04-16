import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/ui/useTheme';
import { ServicesScreen } from '../screens/ServicesScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { ServiceHistoryScreen } from '../screens/ServiceHistoryScreen';

export type ServicesStackParamList = {
  ServicesList: undefined;
  ServiceDetail: { serviceId: string };
  ServiceHistory: undefined;
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export function ServicesNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600', color: colors.neutral900 },
        headerBackTitle: 'Volver',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ServicesList" component={ServicesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Detalle del servicio' }}
      />
      <Stack.Screen
        name="ServiceHistory"
        component={ServiceHistoryScreen}
        options={{ title: 'Historial de servicios', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
