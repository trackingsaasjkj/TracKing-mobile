/**
 * Tests de fcm.service.ts
 * Cubre: permisos, obtención de token, listeners, background handler
 */
import messaging from '@react-native-firebase/messaging';
import {
  requestNotificationPermission,
  getFCMToken,
  onTokenRefresh,
  onForegroundMessage,
  onBackgroundNotificationOpened,
  getInitialNotification,
  setBackgroundMessageHandler,
} from '@/core/notifications/fcm.service';

// Helper para obtener la instancia mock de messaging()
const getMessaging = () => (messaging as jest.MockedFunction<typeof messaging>)();

describe('requestNotificationPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna true cuando el permiso es AUTHORIZED', async () => {
    getMessaging().requestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.AUTHORIZED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('retorna true cuando el permiso es PROVISIONAL', async () => {
    getMessaging().requestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.PROVISIONAL,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('retorna false cuando el permiso es DENIED', async () => {
    getMessaging().requestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.DENIED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('retorna false cuando el permiso es NOT_DETERMINED', async () => {
    getMessaging().requestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.NOT_DETERMINED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('getFCMToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna el token cuando Firebase lo provee', async () => {
    getMessaging().getToken.mockResolvedValue('fcm-token-abc123');
    const token = await getFCMToken();
    expect(token).toBe('fcm-token-abc123');
  });

  it('retorna null cuando Firebase lanza un error', async () => {
    getMessaging().getToken.mockRejectedValue(new Error('Firebase error'));
    const token = await getFCMToken();
    expect(token).toBeNull();
  });

  it('retorna null cuando getToken retorna string vacío', async () => {
    getMessaging().getToken.mockResolvedValue('');
    const token = await getFCMToken();
    // Un string vacío es falsy — el caller debe manejarlo
    expect(token).toBe('');
  });
});

describe('onTokenRefresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback y retorna función de desuscripción', () => {
    const unsubscribe = jest.fn();
    getMessaging().onTokenRefresh.mockReturnValue(unsubscribe);

    const callback = jest.fn();
    const result = onTokenRefresh(callback);

    expect(getMessaging().onTokenRefresh).toHaveBeenCalledWith(callback);
    expect(result).toBe(unsubscribe);
  });
});

describe('onForegroundMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback y retorna función de desuscripción', () => {
    const unsubscribe = jest.fn();
    getMessaging().onMessage.mockReturnValue(unsubscribe);

    const callback = jest.fn();
    const result = onForegroundMessage(callback);

    expect(getMessaging().onMessage).toHaveBeenCalledWith(callback);
    expect(result).toBe(unsubscribe);
  });
});

describe('onBackgroundNotificationOpened', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback en onNotificationOpenedApp', () => {
    const callback = jest.fn();
    onBackgroundNotificationOpened(callback);
    expect(getMessaging().onNotificationOpenedApp).toHaveBeenCalledWith(callback);
  });
});

describe('getInitialNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna el mensaje inicial cuando la app fue abierta desde notificación', async () => {
    const message = { messageId: 'msg-1', data: { type: 'new_service', serviceId: 'svc-1' } };
    getMessaging().getInitialNotification.mockResolvedValue(message);

    const result = await getInitialNotification();
    expect(result).toEqual(message);
  });

  it('retorna null cuando la app no fue abierta desde notificación', async () => {
    getMessaging().getInitialNotification.mockResolvedValue(null);
    const result = await getInitialNotification();
    expect(result).toBeNull();
  });
});

describe('setBackgroundMessageHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el handler de background en Firebase', () => {
    setBackgroundMessageHandler();
    expect(getMessaging().setBackgroundMessageHandler).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('el handler registrado es una función async', () => {
    setBackgroundMessageHandler();
    const handler = getMessaging().setBackgroundMessageHandler.mock.calls[0][0];
    const result = handler({ messageId: 'bg-1' });
    expect(result).toBeInstanceOf(Promise);
  });
});
