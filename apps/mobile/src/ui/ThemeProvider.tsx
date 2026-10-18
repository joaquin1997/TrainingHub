import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Appearance as SystemAppearance, useColorScheme } from 'react-native';

import { useSettings } from '@/features/settings/SettingsContext';
import { deviceStore } from '@/lib/deviceStore';
import type { Appearance } from '@workout/domain';

import { parseAppearance, resolveAppearance, resolveTheme } from './resolveTheme';
import { colors, setActiveTheme, ThemeContext, type ThemeContextValue } from './theme';

const REMEMBERED_KEY = 'appearance';

/**
 * Applies the theme (spec 0038): the account's Appearance once its settings
 * are known, the device's remembered choice before that and when signed out,
 * System otherwise. Switching re-renders every themed component in place
 * (FR-19, FR-20) and points the system surfaces at the same theme (FR-12).
 * Draws nothing until the remembered choice is read, while the splash is
 * still up, so no app frame shows the other theme (FR-21).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const [remembered, setRemembered] = useState<Appearance | null | undefined>(undefined);

  useEffect(() => {
    void deviceStore.get(REMEMBERED_KEY).then((value) => setRemembered(parseAppearance(value)));
  }, []);

  const appearance = resolveAppearance(settings.appearance, remembered ?? null);
  const scheme = resolveTheme(appearance, system);
  // Before the subtree renders, so every colour read below sees it.
  setActiveTheme(scheme);

  // The device remembers the last choice it applied, for the next launch.
  useEffect(() => {
    if (remembered !== undefined && settings.appearance && settings.appearance !== remembered) {
      setRemembered(settings.appearance);
      void deviceStore.set(REMEMBERED_KEY, settings.appearance);
    }
  }, [settings.appearance, remembered]);

  // System sheets, alerts, pickers and the keyboard follow the app (FR-12);
  // with System the override is cleared so device changes are still seen.
  useEffect(() => {
    try {
      SystemAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
    } catch {
      // Older platforms without the override keep their own appearance.
    }
  }, [appearance]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, keyboardAppearance: scheme }),
    [scheme],
  );

  if (remembered === undefined) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}
