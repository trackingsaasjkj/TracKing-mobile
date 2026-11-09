import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import type { Service } from '@/features/services/types/services.types';

type MessagingModule = typeof import('@react-native-firebase/messaging');
type MessagingInstance = ReturnType<MessagingModule['getMessaging']>;

// Expo Go cannot load react-native-firebase native modules. `appOwnership` is
// deprecated and `executionEnvironment` also reports StoreClient for dev
// clients, so rely on expoGoConfig first and, as a final safety net, catch any
// error thrown while loading the native module.
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo' || Constants.expoGoConfig != null;
}

let messagingModule: MessagingModule | null | undefined;

function loadMessagingModule(): MessagingModule | null {
  if (messagingModule !== undefined) return messagingModule;

  if (Platform.OS === 'web' || isExpoGo()) {
    messagingModule = null;
    console.log('[FCM] Push deshabilitado (Expo Go / web)');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('@react-native-firebase/messaging') as
      | MessagingModule
      | undefined;
    messagingModule =
      module && typeof module.getMessaging === 'function' ? module : null;
  } catch {
    // Native module missing (e.g. Expo Go or a dev build without Firebase).
    messagingModule = null;
  }

  if (!messagingModule) {
    console.warn('[FCM] Push deshabilitado (módulo nativo no disponible)');
  }

  return messagingModule;
}

function getMessagingInstance(): MessagingInstance | null {
  const messaging = loadMessagingModule();
  if (!messaging) return null;

  try {
    return messaging.getMessaging();
  } catch (error) {
    console.warn('[FCM] No se pudo obtener la instancia de messaging:', error);
    return null;
  }
}

/** True when push notifications are available in the current build. */
export function isFcmSupported(): boolean {
  return loadMessagingModule() !== null;
}

/**
 * Solicita permiso de notificaciones al usuario (requerido en iOS y Android 13+).
 * Retorna true si el permiso fue concedido.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) {
    console.log('[FCM Mock] requestNotificationPermission → false (push disabled)');
    return false;
  }
  try {
    const authStatus = await messaging.requestPermission(instance);
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
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
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) {
    console.log('[FCM Mock] getFCMToken → null (push disabled)');
    return null;
  }
  try {
    const token = await messaging.getToken(instance);
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
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) return () => {};
  return messaging.onTokenRefresh(instance, callback);
}

/**
 * Listener para notificaciones recibidas con la app en FOREGROUND.
 */
export function onForegroundMessage(
  callback: (message: RemoteMessage) => void,
): () => void {
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) return () => {};
  return messaging.onMessage(instance, callback);
}

/**
 * Listener para cuando el usuario toca una notificación con la app en BACKGROUND.
 */
export function onBackgroundNotificationOpened(
  callback: (message: RemoteMessage) => void,
): void {
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) return;
  messaging.onNotificationOpenedApp(instance, callback);
}

/**
 * Verifica si la app fue abierta desde una notificación (app estaba cerrada).
 */
export async function getInitialNotification(): Promise<RemoteMessage | null> {
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) return null;
  return messaging.getInitialNotification(instance);
}

/**
 * Handler para mensajes en background/killed state.
 * DEBE registrarse fuera del árbol de React (en index.ts).
 */
export function setBackgroundMessageHandler(): void {
  const messaging = loadMessagingModule();
  const instance = getMessagingInstance();
  if (!messaging || !instance) {
    console.log('[FCM Mock] setBackgroundMessageHandler → no-op (push disabled)');
    return;
  }
  try {
    messaging.setBackgroundMessageHandler(instance, async (remoteMessage) => {
      console.log('[FCM] Background message received:', remoteMessage);
    });
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
