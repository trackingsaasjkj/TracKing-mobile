import React, { ReactNode } from 'react';
import { View, GestureResponderEvent } from 'react-native';

interface SwipeableTabContentProps {
  children: ReactNode;
  onTouchStart: (e: GestureResponderEvent) => void;
  onTouchEnd: (e: GestureResponderEvent) => void;
}

/**
 * Componente que envuelve el contenido de los tabs y maneja los gestos de swipe
 * Permite deslizar horizontalmente para navegar entre tabs
 */
export function SwipeableTabContent({
  children,
  onTouchStart,
  onTouchEnd,
}: SwipeableTabContentProps) {
  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onResponderMove={() => {}} // Necesario para que funcione onTouchEnd
    >
      {children}
    </View>
  );
}
