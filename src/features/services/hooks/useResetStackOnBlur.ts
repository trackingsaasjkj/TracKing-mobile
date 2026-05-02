import { useEffect } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServicesList'>;

/**
 * Hook que resetea el stack de navegación cuando el tab pierde el foco
 * Esto previene que se abra automáticamente la pantalla de detalle cuando vuelves al tab
 */
export function useResetStackOnBlur() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      // Cuando el tab pierde el foco, resetear el stack a la pantalla inicial
      navigation.reset({
        index: 0,
        routes: [{ name: 'ServicesList' }],
      });
    }
  }, [isFocused, navigation]);
}
