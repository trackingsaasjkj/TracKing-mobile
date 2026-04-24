import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

/**
 * Solicita permiso de notificaciones al usuario (requerido en iOS y Android 13+).
 * Retorna true si el permiso fue concedido.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Obtiene el FCM token del dispositivo.
 * Este token se debe enviar al backend para poder enviar notificaciones a este dispositivo.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // En Android no se necesita permiso previo para obtener el token,
    // pero en iOS sí. Siempre solicitar permiso antes de llamar esta función.
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('[FCM] Error obteniendo token:', error);
    return null;
  }
}

/**
 * Escucha cuando el token FCM se refresca.
 * Llama al callback con el nuevo token para que el backend lo actualice.
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  return messaging().onTokenRefresh(callback);
}

/**
 * Listener para notificaciones recibidas con la app en FOREGROUND.
 * Retorna una función para desuscribirse.
 */
export function onForegroundMessage(
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): () => void {
  return messaging().onMessage(callback);
}

/**
 * Listener para cuando el usuario toca una notificación con la app en BACKGROUND
 * (app abierta pero en segundo plano).
 */
export function onBackgroundNotificationOpened(
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void,
): void {
  messaging().onNotificationOpenedApp(callback);
}

/**
 * Verifica si la app fue abierta desde una notificación (app estaba cerrada).
 * Útil para navegar a la pantalla correcta al iniciar la app.
 */
export async function getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
  return messaging().getInitialNotification();
}

/**
 * Handler para mensajes en background/killed state.
 * DEBE registrarse fuera del árbol de React (en index.ts).
 */
export function setBackgroundMessageHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] Mensaje en background:', remoteMessage);
    // Aquí puedes guardar datos localmente si necesitas procesarlos
  });
}

/**
 * Listener para notificaciones de actualización de servicio recibidas en FOREGROUND.
 * Filtra mensajes con data.type === 'SERVICE_UPDATE' y parsea el payload del servicio.
 * Retorna una función para desuscribirse.
 *
 * El backend envía el servicio completo en data.payload para evitar un fetch adicional.
 */
export function onServiceUpdateMessage(
  callback: (service: import('@/features/services/types/services.types').Service) => void,
): () => void {
  return onForegroundMessage((message) => {
    if (message.data?.type !== 'SERVICE_UPDATE') return;
    const raw = message.data?.payload;
    if (!raw || typeof raw !== 'string') return;
    try {
      const service = JSON.parse(raw) as import('@/features/services/types/services.types').Service;
      callback(service);
    } catch {
      console.warn('[FCM] Failed to parse SERVICE_UPDATE payload');
    }
  });
}
