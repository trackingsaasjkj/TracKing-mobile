import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  requestNotificationPermission,
  getFCMToken,
  onTokenRefresh,
  onForegroundMessage,
  onBackgroundNotificationOpened,
  getInitialNotification,
} from './fcm.service';
import { apiClient } from '@/core/api/apiClient';

/**
 * Hook principal de FCM. Debe montarse una sola vez en AppProviders
 * cuando el usuario ya está autenticado.
 *
 * Responsabilidades:
 * - Solicitar permiso de notificaciones
 * - Obtener y registrar el FCM token en el backend
 * - Escuchar refrescos de token y actualizarlos en el backend
 * - Manejar notificaciones en foreground
 * - Manejar apertura de notificaciones desde background/killed
 */
export function useFCM() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokenRegistered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeForeground: (() => void) | undefined;

    async function init() {
      // 1. Solicitar permiso
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.warn('[FCM] Permiso de notificaciones denegado');
        return;
      }

      // 2. Obtener token y registrarlo en el backend
      const token = await getFCMToken();
      if (token && !tokenRegistered.current) {
        await registerTokenInBackend(token);
        tokenRegistered.current = true;
      }

      // 3. Escuchar refrescos de token
      unsubscribeTokenRefresh = onTokenRefresh(async (newToken) => {
        console.log('[FCM] Token refrescado');
        await registerTokenInBackend(newToken);
      });

      // 4. Notificaciones en foreground (app abierta)
      unsubscribeForeground = onForegroundMessage((message) => {
        console.log('[FCM] Notificación en foreground:', message);
        // TODO: mostrar un toast/banner in-app con el mensaje
        // Ejemplo: showInAppNotification(message.notification?.title, message.notification?.body)
      });

      // 5. App abierta desde background al tocar notificación
      onBackgroundNotificationOpened((message) => {
        console.log('[FCM] App abierta desde background:', message);
        handleNotificationNavigation(message.data);
      });

      // 6. App abierta desde killed state al tocar notificación
      const initialMessage = await getInitialNotification();
      if (initialMessage) {
        console.log('[FCM] App abierta desde killed state:', initialMessage);
        handleNotificationNavigation(initialMessage.data);
      }
    }

    init();

    return () => {
      unsubscribeTokenRefresh?.();
      unsubscribeForeground?.();
    };
  }, [isAuthenticated]);
}

async function registerTokenInBackend(token: string): Promise<void> {
  try {
    await apiClient.post('/api/notifications/fcm-token', { token });
    console.log('[FCM] Token registrado en backend');
  } catch (error) {
    console.error('[FCM] Error registrando token en backend:', error);
  }
}

/**
 * Navega a la pantalla correcta según el tipo de notificación.
 * Extender según los tipos de notificaciones que se implementen.
 */
function handleNotificationNavigation(data?: Record<string, string>): void {
  if (!data) return;

  switch (data.type) {
    case 'new_service':
      // TODO: navegar a detalle del servicio
      // navigationRef.navigate('ServiceDetail', { serviceId: data.serviceId })
      console.log('[FCM] Navegar a nuevo servicio:', data.serviceId);
      break;
    case 'service_update':
      console.log('[FCM] Navegar a actualización de servicio:', data.serviceId);
      break;
    case 'settlement_ready':
      console.log('[FCM] Navegar a liquidaciones');
      break;
    default:
      console.log('[FCM] Tipo de notificación desconocido:', data.type);
  }
}
