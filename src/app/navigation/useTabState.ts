import { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './TabNavigator';
import { TAB_ORDER, SWIPE_CONFIG } from './swipeConfig';

/**
 * Hook para sincronizar el estado del tab actual con la navegación
 * Retorna el índice del tab activo
 */
export function useTabState() {
  const route = useRoute();
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  useEffect(() => {
    // Obtener el nombre del tab actual de la ruta
    const routeName = route.name as keyof MainTabParamList;
    const tabIndex = TAB_ORDER.indexOf(routeName as any);
    
    if (tabIndex !== -1) {
      setCurrentTabIndex(tabIndex);
      if (SWIPE_CONFIG.DEBUG) {
        console.log('[TabState] Tab actual:', routeName, 'índice:', tabIndex);
      }
    }
  }, [route.name]);

  return currentTabIndex;
}
