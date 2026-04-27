import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/shared/ui/useTheme';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { ServicesNavigator } from '@/features/services/navigation/ServicesNavigator';
import { WorkdayScreen } from '@/features/workday/screens/WorkdayScreen';
import { EarningsScreen } from '@/features/earnings/screens/EarningsScreen';
import { TrackingScreen } from '@/features/tracking/screens/TrackingScreen';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  // Dedicated full-screen map tab — active only when courier is IN_SERVICE
  Tracking: undefined;
  Earnings: undefined;
  Config: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Home:     { active: '🏠', inactive: '🏡' },
  Orders:   { active: '📦', inactive: '📫' },
  Tracking: { active: '📍', inactive: '🗺️' },
  Earnings: { active: '💰', inactive: '💵' },
  Config:   { active: '⚙️', inactive: '🔧' },
};

export function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral500,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.neutral200,
        },  
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <Text style={{ fontSize: size - 4 }}>
              {focused ? icons.active : icons.inactive}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}        options={{ title: 'Inicio' }} />
      <Tab.Screen name="Orders"   component={ServicesNavigator} options={{ title: 'Servicios', headerShown: false }} />
      <Tab.Screen name="Tracking" component={TrackingScreen}    options={{ title: 'Mapa' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen}    options={{ title: 'Reportes' }} />
      <Tab.Screen name="Config"   component={WorkdayScreen}     options={{ title: 'Config' }} />
    </Tab.Navigator>
  );
}
