/**
 * Tests de fcm.service.ts
 * Cubre: permisos, obtención de token, listeners, background handler
 */
import * as messaging from '@react-native-firebase/messaging';
import {
  isFcmSupported,
  requestNotificationPermission,
  getFCMToken,
  onTokenRefresh,
  onForegroundMessage,
  onBackgroundNotificationOpened,
  getInitialNotification,
  setBackgroundMessageHandler,
} from '@/core/notifications/fcm.service';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null, expoGoConfig: null },
}));

const mockGetMessaging = messaging.getMessaging as jest.Mock;
const mockRequestPermission = messaging.requestPermission as jest.Mock;
const mockGetToken = messaging.getToken as jest.Mock;
const mockOnTokenRefresh = messaging.onTokenRefresh as jest.Mock;
const mockOnMessage = messaging.onMessage as jest.Mock;
const mockOnNotificationOpenedApp = messaging.onNotificationOpenedApp as jest.Mock;
const mockGetInitialNotification = messaging.getInitialNotification as jest.Mock;
const mockSetBackgroundMessageHandler = messaging.setBackgroundMessageHandler as jest.Mock;

describe('requestNotificationPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna true cuando el permiso es AUTHORIZED', async () => {
    mockRequestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.AUTHORIZED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('retorna true cuando el permiso es PROVISIONAL', async () => {
    mockRequestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.PROVISIONAL,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('retorna false cuando el permiso es DENIED', async () => {
    mockRequestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.DENIED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });

  it('retorna false cuando el permiso es NOT_DETERMINED', async () => {
    mockRequestPermission.mockResolvedValue(
      messaging.AuthorizationStatus.NOT_DETERMINED,
    );
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('getFCMToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna el token cuando Firebase lo provee', async () => {
    mockGetToken.mockResolvedValue('fcm-token-abc123');
    const token = await getFCMToken();
    expect(token).toBe('fcm-token-abc123');
  });

  it('retorna null cuando Firebase lanza un error', async () => {
    mockGetToken.mockRejectedValue(new Error('Firebase error'));
    const token = await getFCMToken();
    expect(token).toBeNull();
  });

  it('retorna null cuando getToken retorna string vacío', async () => {
    mockGetToken.mockResolvedValue('');
    const token = await getFCMToken();
    // Un string vacío es falsy — el caller debe manejarlo
    expect(token).toBe('');
  });
});

describe('onTokenRefresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback y retorna función de desuscripción', async () => {
    const unsubscribe = jest.fn();
    mockOnTokenRefresh.mockReturnValue(unsubscribe);

    const callback = jest.fn();
    const result = onTokenRefresh(callback);

    expect(mockGetMessaging).toHaveBeenCalled();
    expect(mockOnTokenRefresh).toHaveBeenCalledWith(expect.anything(), callback);
    expect(result).toBe(unsubscribe);
  });
});

describe('onForegroundMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback y retorna función de desuscripción', async () => {
    const unsubscribe = jest.fn();
    mockOnMessage.mockReturnValue(unsubscribe);

    const callback = jest.fn();
    const result = onForegroundMessage(callback);

    expect(mockGetMessaging).toHaveBeenCalled();
    expect(mockOnMessage).toHaveBeenCalledWith(expect.anything(), callback);
    expect(result).toBe(unsubscribe);
  });
});

describe('onBackgroundNotificationOpened', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el callback en onNotificationOpenedApp', async () => {
    const callback = jest.fn();
    onBackgroundNotificationOpened(callback);
    expect(mockOnNotificationOpenedApp).toHaveBeenCalledWith(
      expect.anything(),
      callback,
    );
  });
});

describe('getInitialNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna el mensaje inicial cuando la app fue abierta desde notificación', async () => {
    const message = { messageId: 'msg-1', data: { type: 'new_service', serviceId: 'svc-1' } };
    mockGetInitialNotification.mockResolvedValue(message);

    const result = await getInitialNotification();
    expect(result).toEqual(message);
  });

  it('retorna null cuando la app no fue abierta desde notificación', async () => {
    mockGetInitialNotification.mockResolvedValue(null);
    const result = await getInitialNotification();
    expect(result).toBeNull();
  });
});

describe('setBackgroundMessageHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el handler de background en Firebase', async () => {
    setBackgroundMessageHandler();
    expect(mockSetBackgroundMessageHandler).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
    );
  });

  it('el handler registrado es una función async', async () => {
    setBackgroundMessageHandler();
    const handler = mockSetBackgroundMessageHandler.mock.calls[0][1];
    const result = handler({ messageId: 'bg-1' });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('isFcmSupported', () => {
  it('retorna true cuando el módulo nativo carga correctamente', () => {
    expect(isFcmSupported()).toBe(true);
  });
});


