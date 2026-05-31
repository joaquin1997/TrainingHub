import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { useSettings } from '@/features/settings/SettingsContext';
import { colors } from '@/ui/theme';

import { getDeviceLanguage } from './device';
import i18n from './index';
import { resolveI18nLanguage } from './resolveLanguage';

/**
 * Keeps the i18next language in sync with the user's setting, falling back to
 * the device locale when no explicit language has been chosen.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, isLoading } = useSettings();
  const language = resolveI18nLanguage({
    deviceLanguage: getDeviceLanguage(),
    isSettingsLoading: isLoading,
    settingsLanguage: settings.language,
  });

  useEffect(() => {
    if (!language) {
      return;
    }

    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  if (!language) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
