import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { getDeviceLanguage } from './device';
import { en } from './locales/en';
import { es } from './locales/es';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });
}

export default i18n;
