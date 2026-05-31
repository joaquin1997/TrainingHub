import { getLocales } from 'expo-localization';

import type { AppLanguage } from '@workout/domain';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'es'];

/** Resolve the device's preferred language, defaulting to English. */
export function getDeviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'es' ? 'es' : 'en';
}
