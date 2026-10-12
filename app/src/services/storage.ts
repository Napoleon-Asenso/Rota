import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'rota_access_token';
const REFRESH_TOKEN_KEY = 'rota_refresh_token';

// In-memory fallback for SSR or environments without localStorage
const memoryStore = new Map<string, string>();

function isWeb(): boolean {
  return Platform.OS === 'web';
}

function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Saves both access and refresh tokens to secure device storage (or web fallback).
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (isWeb()) {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem(ACCESS_TOKEN_KEY, accessToken);
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      memoryStore.set(ACCESS_TOKEN_KEY, accessToken);
      memoryStore.set(REFRESH_TOKEN_KEY, refreshToken);
    }
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Retrieves the stored access token.
 */
export async function getAccessToken(): Promise<string | null> {
  if (isWeb()) {
    const storage = getWebStorage();
    if (storage) {
      return storage.getItem(ACCESS_TOKEN_KEY);
    }
    return memoryStore.get(ACCESS_TOKEN_KEY) || null;
  }

  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/**
 * Retrieves the stored refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  if (isWeb()) {
    const storage = getWebStorage();
    if (storage) {
      return storage.getItem(REFRESH_TOKEN_KEY);
    }
    return memoryStore.get(REFRESH_TOKEN_KEY) || null;
  }

  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Clears both stored tokens from storage.
 */
export async function clearTokens(): Promise<void> {
  if (isWeb()) {
    const storage = getWebStorage();
    if (storage) {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      memoryStore.delete(ACCESS_TOKEN_KEY);
      memoryStore.delete(REFRESH_TOKEN_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
