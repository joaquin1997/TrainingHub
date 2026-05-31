import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { settingsClient } from '@/features/settings/api/settingsClient';
import type { UpdateUserSettingsInput, UserSettings } from '@workout/domain';

const DEFAULT_SETTINGS: UserSettings = { unit: 'kg', defaultRestSeconds: 90 };

interface SettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  update: (input: UpdateUserSettingsInput) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  update: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    settingsClient
      .get()
      .then((next) => {
        if (active) {
          setSettings(next);
        }
      })
      .catch(() => {
        // Keep defaults if settings can't be loaded.
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

  return (
    <SettingsContext.Provider value={{ settings, isLoading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
