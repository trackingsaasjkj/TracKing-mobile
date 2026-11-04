import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import type { Service } from '@/features/services/types/services.types';

// True when Firebase native modules are NOT available:
// - Expo Go (storeClient execution environment)
// - Web (react-native-firebase never works in a browser)
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo' ||
  Platform.OS === 'web';

type MessagingModule = typeof import('@react-native-firebase/messaging');

// ─── Lazy-load real Firebase only in native builds ────────────────────────────
function getMessagingModule(): MessagingModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-firebase/messaging') as MessagingModule;
}

function getMessagingInstance() {
  return getMessagingModule().getMessaging();
}

/**
 * Solicita permiso de notificaciones al usuario (requerido en iOS y Android 13+).
 * Retorna true si el permiso fue concedido.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (IS_EXPO_GO) {
    console.log('[FCM Mock] requestNotificationPermission → true');
    return true;
  }
  try {
    const messagingModule = getMessagingModule();
    const authStatus = await messagingModule.requestPermission(getMessagingInstance());
    const granted =
      authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
      authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;
    if (!granted) {
      console.warn('[FCM] Notification permission denied. Status:', authStatus);
    } else {
      console.log('[FCM] Notification permission granted');
    }
    return granted;
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Obtiene el FCM token del dispositivo.
 */
export async function getFCMToken(): Promise<string | null> {
  if (IS_EXPO_GO) {
    console.log('[FCM Mock] getFCMToken → null (Expo Go)');
    return null;
  }
  try {
    const messagingModule = getMessagingModule();
    const token = await messagingModule.getToken(getMessagingInstance());
    if (token) {
      console.log('[FCM] Token obtained successfully');
    } else {
      console.warn('[FCM] No token returned from Firebase');
    }
    return token;
  } catch (error) {
    console.error('[FCM] Error obteniendo token:', error);
    return null;
  }
}

/**
 * Escucha cuando el token FCM se refresca.
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  if (IS_EXPO_GO) return () => {};
  const messagingModule = getMessagingModule();
  return messagingModule.onTokenRefresh(getMessagingInstance(), callback);
}

/**
 * Listener para notificaciones recibidas con la app en FOREGROUND.
 */
export function onForegroundMessage(
  callback: (message: RemoteMessage) => void,
): () => void {
  if (IS_EXPO_GO) return () => {};
  const messagingModule = getMessagingModule();
  return messagingModule.onMessage(getMessagingInstance(), callback);
}

/**
 * Listener para cuando el usuario toca una notificación con la app en BACKGROUND.
 */
export function onBackgroundNotificationOpened(
  callback: (message: RemoteMessage) => void,
): void {
  if (IS_EXPO_GO) return;
  const messagingModule = getMessagingModule();
  messagingModule.onNotificationOpenedApp(getMessagingInstance(), callback);
}

/**
 * Verifica si la app fue abierta desde una notificación (app estaba cerrada).
 */
export async function getInitialNotification(): Promise<RemoteMessage | null> {
  if (IS_EXPO_GO) return null;
  const messagingModule = getMessagingModule();
  return messagingModule.getInitialNotification(getMessagingInstance());
}

/**
 * Handler para mensajes en background/killed state.
 * DEBE registrarse fuera del árbol de React (en index.ts).
 */
export function setBackgroundMessageHandler(): void {
  if (IS_EXPO_GO) {
    console.log('[FCM Mock] setBackgroundMessageHandler → no-op (Expo Go)');
    return;
  }
  try {
    const messagingModule = getMessagingModule();
    messagingModule.setBackgroundMessageHandler(
      getMessagingInstance(),
      async (remoteMessage) => {
        console.log('[FCM] Background message received:', remoteMessage);
      },
    );
    console.log('[FCM] Background message handler registered successfully');
  } catch (error) {
    console.error('[FCM] Error setting background message handler:', error);
  }
}

/**
 * Listener para notificaciones de actualización de servicio en FOREGROUND.
 */
export function onServiceUpdateMessage(
  callback: (service: Service) => void,
): () => void {
  return onForegroundMessage((message) => {
    if (message.data?.type !== 'SERVICE_UPDATE') return;
    const raw = message.data?.payload;
    if (!raw || typeof raw !== 'string') return;
    try {
      const service = JSON.parse(raw) as Service;
      callback(service);
    } catch {
      console.warn('[FCM] Failed to parse SERVICE_UPDATE payload');
    }
  });
}
