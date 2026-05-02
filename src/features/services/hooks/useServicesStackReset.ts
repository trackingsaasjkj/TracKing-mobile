import { useEffect } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServicesList'>;

/**
 * Hook que resetea el stack de servicios cuando el tab pierde el foco
 * Esto previene que ServiceDetailScreen se abra automáticamente cuando volvemos al tab
 * 
 * Uso en ServicesScreen:
 * useServicesStackReset();
 */
export function useServicesStackReset() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      // Cuando el tab pierde el foco, resetear el stack a ServicesList
      // Usamos popToTop() que es más seguro que reset()
      try {
        navigation.popToTop();
      } catch (error) {
        // Ignorar errores si popToTop no está disponible en este contexto
        console.debug('[useServicesStackReset] popToTop no disponible');
      }
    }
  }, [isFocused, navigation]);
}
