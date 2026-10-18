import type { Appearance } from '@workout/domain';

import type { ThemeName } from './tokens';

/**
 * The appearance in force (spec 0038 EF-1 – EF-7): the account's choice when
 * it carries one, else the device's remembered one, else System.
 */
export function resolveAppearance(
  account: Appearance | undefined,
  remembered: Appearance | null,
): Appearance {
  return account ?? remembered ?? 'system';
}

/** The theme drawn: System follows the device; an unknown device appearance is dark (EF-6). */
export function resolveTheme(
  appearance: Appearance,
  system: string | null | undefined,
): ThemeName {
  if (appearance !== 'system') {
    return appearance;
  }
  return system === 'light' ? 'light' : 'dark';
}

export function parseAppearance(value: string | null): Appearance | null {
  return value === 'system' || value === 'light' || value === 'dark' ? value : null;
}
