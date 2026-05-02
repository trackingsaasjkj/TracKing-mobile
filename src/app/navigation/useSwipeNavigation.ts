import { useEffect, useRef } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './TabNavigator';
import { useTabState } from './useTabState';
import { SWIPE_CONFIG, TAB_ORDER } from './swipeConfig';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Hook para manejar la navegación por swipe entre tabs
 * Detecta gestos de deslizamiento horizontal y navega entre tabs
 * 
 * Uso:
 * const { onTouchStart, onTouchEnd } = useSwipeNavigation();
 * 
 * <View onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
 *   {children}
 * </View>
 */
export function useSwipeNavigation() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const currentTabIndex = useTabState();
  const swipeState = useRef<SwipeState>({ startX: 0, startY: 0, startTime: 0 });

  const handleSwipe = (endX: number, endY: number, endTime: number) => {
    if (!SWIPE_CONFIG.ENABLED) {
      return;
    }

    const deltaX = endX - swipeState.current.startX;
    const deltaY = endY - swipeState.current.startY;
    const duration = endTime - swipeState.current.startTime;

    // Ignorar si el swipe tardó demasiado
    if (duration > SWIPE_CONFIG.MAX_DURATION) {
      if (SWIPE_CONFIG.DEBUG) {
        console.log('[Swipe] Ignorado: duración demasiada larga', duration);
      }
      return;
    }

    // Ignorar si el movimiento vertical es mayor que el horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (SWIPE_CONFIG.DEBUG) {
        console.log('[Swipe] Ignorado: movimiento vertical mayor', deltaY, deltaX);
      }
      return;
    }

    // Ignorar si el swipe es muy pequeño
    if (Math.abs(deltaX) < SWIPE_CONFIG.THRESHOLD) {
      if (SWIPE_CONFIG.DEBUG) {
        console.log('[Swipe] Ignorado: distancia muy pequeña', deltaX);
      }
      return;
    }

    if (SWIPE_CONFIG.DEBUG) {
      console.log('[Swipe] Detectado:', deltaX > 0 ? 'derecha' : 'izquierda', deltaX);
    }

    if (deltaX > 0) {
      // Swipe a la derecha - ir al tab anterior
      const prevIndex = Math.max(0, currentTabIndex - 1);
      const targetTab = TAB_ORDER[prevIndex] as keyof MainTabParamList;
      navigation.navigate(targetTab);
    } else {
      // Swipe a la izquierda - ir al tab siguiente
      const nextIndex = Math.min(TAB_ORDER.length - 1, currentTabIndex + 1);
      const targetTab = TAB_ORDER[nextIndex] as keyof MainTabParamList;
      navigation.navigate(targetTab);
    }
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    swipeState.current = {
      startX: e.nativeEvent.pageX,
      startY: e.nativeEvent.pageY,
      startTime: Date.now(),
    };
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;
    const endTime = Date.now();
    handleSwipe(endX, endY, endTime);
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
}
