// Silence the expo winter runtime warning in tests
global.__ExpoImportMetaRegistry = {};

// Prevent expo winter runtime from trying to load native modules
jest.mock('expo/src/winter/runtime.native', () => {}, { virtual: true });

// Mock expo-secure-store (native module)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-location (native module)
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// Mock expo-camera (native module)
jest.mock('expo-camera', () => ({
  Camera: {},
  CameraView: 'CameraView',
  requestCameraPermissionsAsync: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock @react-native-firebase/messaging (native module)
jest.mock('@react-native-firebase/messaging', () => {
  const messagingInstance = {
    requestPermission: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
  };
  const messaging = jest.fn(() => messagingInstance);
  messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2, DENIED: -1, NOT_DETERMINED: 0 };
  // fcm.service.ts does: require('@react-native-firebase/messaging').default
  // so we need to expose the mock as both the default export and the module itself
  messaging.default = messaging;
  return messaging;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
