import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage boundary for the auth token. The app depends on this interface, not on
 * a concrete store, so the implementation can change per platform (iOS Keychain
 * / Android Keystore via SecureStore, a web fallback, an in-memory test double).
 */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

const TOKEN_KEY = 'traininghub.authToken';

/** In-memory fallback (used on web, where SecureStore is unavailable). */
function createMemoryTokenStorage(): TokenStorage {
  let token: string | null = null;
  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
    clear: async () => {
      token = null;
    },
  };
}

/** SecureStore-backed storage — works on iOS (Keychain) and Android (Keystore). */
function createSecureTokenStorage(): TokenStorage {
  return {
    get: () => SecureStore.getItemAsync(TOKEN_KEY),
    set: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
    clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  };
}

export const tokenStorage: TokenStorage =
  Platform.OS === 'web'
    ? createMemoryTokenStorage()
    : createSecureTokenStorage();
