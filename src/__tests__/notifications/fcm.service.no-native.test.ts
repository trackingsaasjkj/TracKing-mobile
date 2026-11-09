/**
 * FCM must degrade gracefully when the native module cannot be loaded
 * (Expo Go, web or a native build without Firebase linked).
 */

type FcmService = typeof import('@/core/notifications/fcm.service');

function loadService(): FcmService {
  return require('@/core/notifications/fcm.service') as FcmService;
}

describe('FCM sin módulo nativo', () => {
  afterEach(() => {
    jest.dontMock('@react-native-firebase/messaging');
    jest.dontMock('expo-constants');
    jest.resetModules();
  });

  it('no lanza y deshabilita push si el require lanza', async () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { appOwnership: null, expoGoConfig: null },
    }));
    jest.doMock('@react-native-firebase/messaging', () => {
      throw new Error('NativeRNFBTurboApp is not registered');
    });

    const service = loadService();

    expect(service.isFcmSupported()).toBe(false);
    expect(service.onForegroundMessage(jest.fn())).toEqual(expect.any(Function));
    expect(service.onTokenRefresh(jest.fn())).toEqual(expect.any(Function));
    expect(service.onBackgroundNotificationOpened(jest.fn())).toBeUndefined();
    expect(() => service.setBackgroundMessageHandler()).not.toThrow();
    await expect(service.getInitialNotification()).resolves.toBeNull();
  });

  it('no lanza si el require devuelve undefined', async () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { appOwnership: null, expoGoConfig: null },
    }));
    jest.doMock('@react-native-firebase/messaging', () => undefined);

    const service = loadService();

    expect(service.isFcmSupported()).toBe(false);
    await expect(service.requestNotificationPermission()).resolves.toBe(false);
    await expect(service.getFCMToken()).resolves.toBeNull();
  });

  it('no intenta cargar Firebase en Expo Go', () => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        appOwnership: 'expo',
        expoGoConfig: { debuggerHost: 'localhost' },
      },
    }));
    jest.doMock('@react-native-firebase/messaging', () => {
      throw new Error('Firebase must not be required in Expo Go');
    });

    const service = loadService();

    expect(service.isFcmSupported()).toBe(false);
    expect(() => service.setBackgroundMessageHandler()).not.toThrow();
  });
});
