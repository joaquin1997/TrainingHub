import type { AppLanguage } from '@workout/domain';

type ResolveI18nLanguageInput = {
  deviceLanguage: AppLanguage;
  isSettingsLoading: boolean;
  settingsLanguage: AppLanguage | null;
};

export function resolveI18nLanguage({
  deviceLanguage,
  isSettingsLoading,
  settingsLanguage,
}: ResolveI18nLanguageInput): AppLanguage | null {
  if (isSettingsLoading) {
    return null;
  }

  return settingsLanguage ?? deviceLanguage;
}
