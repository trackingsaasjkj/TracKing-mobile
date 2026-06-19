import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// Fallback para web usando localStorage
const webStorage = {
  async removeItem(key: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
  async getItem(key: string) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
};

export const secureStorage = {
  // Access Token
  async setAccessToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await webStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async clearAccessToken(): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.removeItem(ACCESS_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }
  },

  // Refresh Token
  async setRefreshToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await webStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearRefreshToken(): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },

  // Clear all tokens
  async clearAllTokens(): Promise<void> {
    await Promise.all([
      this.clearAccessToken(),
      this.clearRefreshToken(),
    ]);
  },
};
