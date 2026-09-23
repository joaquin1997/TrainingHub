import { describe, expect, it } from 'vitest';

import { resolveI18nLanguage } from './resolveLanguage';

describe('resolveI18nLanguage', () => {
  it('waits for settings before applying the device language', () => {
    expect(
      resolveI18nLanguage({
        deviceLanguage: 'es',
        isSettingsLoading: true,
        settingsLanguage: null,
      }),
    ).toBeNull();
  });

  it('uses an explicit user language instead of the device language', () => {
    expect(
      resolveI18nLanguage({
        deviceLanguage: 'es',
        isSettingsLoading: false,
        settingsLanguage: 'en',
      }),
    ).toBe('en');
  });

  it('uses the device language when the user follows the system', () => {
    expect(
      resolveI18nLanguage({
        deviceLanguage: 'es',
        isSettingsLoading: false,
        settingsLanguage: null,
      }),
    ).toBe('es');
  });
});
