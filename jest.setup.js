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
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getBackgroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  hasStartedLocationUpdatesAsync: jest.fn(() => Promise.resolve(false)),
  startLocationUpdatesAsync: jest.fn(() => Promise.resolve()),
  stopLocationUpdatesAsync: jest.fn(() => Promise.resolve()),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3, High: 4 },
}));

// Mock expo-task-manager (native module)
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-camera (native module)
jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn() },
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
  const messagingInstance = {};
  return {
    getMessaging: jest.fn(() => messagingInstance),
    requestPermission: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, DENIED: -1, NOT_DETERMINED: 0 },
  };
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

// Mock expo-image-manipulator (native module)
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri) => Promise.resolve({ uri })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
