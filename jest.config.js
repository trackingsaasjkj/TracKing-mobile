// jest.config.js — configuración Jest para pnpm con Expo/React Native
// react-native@0.83.6/jest/setup.js usa ESM (import) y Jest no puede procesarlo
// en modo CommonJS. Lo mockeamos via moduleNameMapper para evitar el error.

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',

  setupFiles: [
    './jest.setup.js',
  ],

  moduleNameMapper: {
    // Mock react-native/jest/setup.js que usa ESM incompatible con Jest CJS
    'react-native/jest/setup': '<rootDir>/src/__tests__/__mocks__/rn-jest-setup.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo$': '<rootDir>/src/__tests__/__mocks__/expo.js',
    '^expo/(.*)$': '<rootDir>/src/__tests__/__mocks__/expo.js',
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
  ],
};
