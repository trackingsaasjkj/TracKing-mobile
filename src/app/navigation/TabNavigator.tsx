import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { HomeScreen } from '@/features/dashboard/screens/HomeScreen';
import { ServicesNavigator } from '@/features/services/navigation/ServicesNavigator';
import { WorkdayScreen } from '@/features/workday/screens/WorkdayScreen';
import { EarningsScreen } from '@/features/earnings/screens/EarningsScreen';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  Config: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<
  keyof MainTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home:     { active: 'home',           inactive: 'home-outline' },
  Orders:   { active: 'cube',           inactive: 'cube-outline' },
  Earnings: { active: 'bar-chart',      inactive: 'bar-chart-outline' },
  Config:   { active: 'settings',       inactive: 'settings-outline' },
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
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={focused ? colors.primary : colors.neutral500}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}        options={{ title: 'Inicio' }} />
      <Tab.Screen
        name="Orders"
        component={ServicesNavigator}
        options={{ title: 'Servicios', headerShown: false }}
        listeners={({ navigation }) => ({
          // Every time the Orders tab is pressed (whether switching to it or
          // tapping it again while already on it), reset the nested stack to
          // ServicesList so the user never lands on a detail screen.
          tabPress: () => {
            navigation.navigate('Orders', { screen: 'ServicesList' } as any);
          },
        })}
      />
      <Tab.Screen name="Earnings" component={EarningsScreen}    options={{ title: 'Reportes' }} />
      <Tab.Screen name="Config"   component={WorkdayScreen}     options={{ title: 'Config' }} />
    </Tab.Navigator>
  );
}
