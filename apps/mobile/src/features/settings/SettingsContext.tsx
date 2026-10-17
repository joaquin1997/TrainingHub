import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { settingsClient } from '@/features/settings/api/settingsClient';
import type { UpdateUserSettingsInput, UserSettings } from '@workout/domain';

const DEFAULT_SETTINGS: UserSettings = {
  unit: 'kg',
  defaultRestSeconds: 90,
  language: null,
};

/** Whether the account's settings are known, or the defaults stand in (spec 0037 EF-2). */
export type SettingsLoadState = 'loading' | 'loaded' | 'failed';

interface SettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  loadState: SettingsLoadState;
  update: (input: UpdateUserSettingsInput) => Promise<void>;
  /** Saves and applies, or throws without changing anything (spec 0037 EF-3). */
  save: (input: UpdateUserSettingsInput) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  loadState: 'loading',
  update: async () => {},
  save: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadState, setLoadState] = useState<SettingsLoadState>('loading');

  // (Re)load settings for the current user whenever auth state changes.
  useEffect(() => {
    if (!isAuthenticated) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      setLoadState('loading');
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadState('loading');
    settingsClient
      .get()
      .then((next) => {
        if (active) {
          setSettings(next);
          setLoadState('loaded');
        }
      })
      .catch(() => {
        // Keep defaults if settings can't be loaded.
        if (active) {
          setLoadState('failed');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const update = useCallback(async (input: UpdateUserSettingsInput) => {
    // Optimistic; revert by reloading on failure.
    setSettings((current) => ({ ...current, ...input }));
    try {
      const saved = await settingsClient.update(input);
      setSettings(saved);
    } catch {
      const reloaded = await settingsClient.get().catch(() => null);
      if (reloaded) {
        setSettings(reloaded);
      }
    }
  }, []);

  const save = useCallback(async (input: UpdateUserSettingsInput) => {
    const saved = await settingsClient.update(input);
    setSettings(saved);
    setLoadState('loaded');
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, loadState, update, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
