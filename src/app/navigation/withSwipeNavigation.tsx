import React, { ComponentType } from 'react';
import { View } from 'react-native';
import { useSwipeNavigation } from './useSwipeNavigation';

/**
 * HOC que envuelve un componente de pantalla y le agrega la funcionalidad de swipe
 * 
 * Uso:
 * export const HomeScreenWithSwipe = withSwipeNavigation(HomeScreen);
 * 
 * Luego en TabNavigator:
 * <Tab.Screen name="Home" component={HomeScreenWithSwipe} />
 */
export function withSwipeNavigation<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function SwipeNavigationWrapper(props: P) {
    const { onTouchStart, onTouchEnd } = useSwipeNavigation();

    return (
      <View
        style={{ flex: 1 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Component {...props} />
      </View>
    );
  };
}
