import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '@/shared/ui/colors';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { ServicesNavigator } from '@/features/services/navigation/ServicesNavigator';
import { WorkdayScreen } from '@/features/workday/screens/WorkdayScreen';
import { EarningsScreen } from '@/features/earnings/screens/EarningsScreen';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral800,
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={ServicesNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Profile" component={WorkdayScreen} />
    </Tab.Navigator>
  );
}
