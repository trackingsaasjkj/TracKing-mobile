import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/shared/ui/colors';
import { ServicesScreen } from '../screens/ServicesScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';

export type ServicesStackParamList = {
  ServicesList: undefined;
  ServiceDetail: { serviceId: string };
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export function ServicesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: 'Volver',
      }}
    >
      <Stack.Screen
        name="ServicesList"
        component={ServicesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Detalle del servicio' }}
      />
    </Stack.Navigator>
  );
}
