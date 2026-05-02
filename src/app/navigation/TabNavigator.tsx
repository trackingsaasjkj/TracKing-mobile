import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/shared/ui/useTheme';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { ServicesNavigator } from '@/features/services/navigation/ServicesNavigator';
import { WorkdayScreen } from '@/features/workday/screens/WorkdayScreen';
import { EarningsScreen } from '@/features/earnings/screens/EarningsScreen';
import { withSwipeNavigation } from './withSwipeNavigation';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  Config: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Home:     { active: '🏠', inactive: '🏡' },
  Orders:   { active: '📦', inactive: '📫' },
  Earnings: { active: '💰', inactive: '💵' },
  Config:   { active: '⚙️', inactive: '🔧' },
};

// Envolver componentes con swipe navigation
const HomeScreenWithSwipe = withSwipeNavigation(HomeScreen);
const ServicesNavigatorWithSwipe = withSwipeNavigation(ServicesNavigator);
const EarningsScreenWithSwipe = withSwipeNavigation(EarningsScreen);
const WorkdayScreenWithSwipe = withSwipeNavigation(WorkdayScreen);

export function TabNavigator() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const lastTabRef = useRef<string>('Home');

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      // Get the current route
      const state = e.data.state;
      const currentRoute = state.routes[state.index]?.name;

      // If we're leaving Orders tab, reset its stack
      if (lastTabRef.current === 'Orders' && currentRoute !== 'Orders') {
        // Navigate to Orders with ServicesList to reset the stack
        navigation.navigate('Orders', {
          screen: 'ServicesList',
        } as any);
      }

      lastTabRef.current = currentRoute || 'Home';
    });

    return unsubscribe;
  }, [navigation]);

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
      <Tab.Screen name="Home"     component={HomeScreenWithSwipe}        options={{ title: 'Inicio' }} />
      <Tab.Screen name="Orders"   component={ServicesNavigatorWithSwipe} options={{ title: 'Servicios', headerShown: false }} />
      <Tab.Screen name="Earnings" component={EarningsScreenWithSwipe}    options={{ title: 'Reportes' }} />
      <Tab.Screen name="Config"   component={WorkdayScreenWithSwipe}     options={{ title: 'Config' }} />
    </Tab.Navigator>
  );
}
