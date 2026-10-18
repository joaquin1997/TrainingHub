import { describe, expect, it } from 'vitest';

import { parseAppearance, resolveAppearance, resolveTheme } from './resolveTheme';

describe('resolveAppearance (spec 0038)', () => {
  it('uses the account choice once known', () => {
    expect(resolveAppearance('light', 'dark')).toBe('light');
  });

  it('falls back to the remembered choice, then System (EF-1, EF-4, EF-7)', () => {
    expect(resolveAppearance(undefined, 'dark')).toBe('dark');
    expect(resolveAppearance(undefined, null)).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('follows the device with System (AC-4)', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('system', 'dark')).toBe('dark');
  });

  it('is dark when the device cannot tell (EF-6, AC-16)', () => {
    expect(resolveTheme('system', null)).toBe('dark');
    expect(resolveTheme('system', 'unspecified')).toBe('dark');
  });

  it('keeps an explicit choice whatever the device says', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('reads only known stored values', () => {
    expect(parseAppearance('light')).toBe('light');
    expect(parseAppearance('sepia')).toBeNull();
    expect(parseAppearance(null)).toBeNull();
  });
});
