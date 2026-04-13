import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Configura NetInfo para NO hacer ping a hosts externos para verificar
 * reachability. Esto evita la advertencia de "múltiples hosts" en el
 * debugger de React Native y elimina tráfico innecesario a google.com.
 */
NetInfo.configure({
  reachabilityLongTimeout: 60 * 1000,
  reachabilityShortTimeout: 5 * 1000,
  reachabilityRequestTimeout: 15 * 1000,
  reachabilityShouldRun: () => false, // desactiva el ping externo
});

export function useNetworkStatus(): boolean | null {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  }, []);

  return isConnected;
}
