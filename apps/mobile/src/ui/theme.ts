import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';

import {
  fonts,
  fontScaleCap,
  layout,
  palettes,
  radii,
  spacing,
  typeScale,
  type Palette,
  type ThemeName,
} from './tokens';

/**
 * Screens import the tokens from here (the values live in `tokens.ts`, the
 * only file where they are written — spec 0034 FR-10 – FR-12) together with
 * the shared styles built on them.
 *
 * Colours are resolved when they are read, from the active theme (spec 0038
 * FR-19): `colors.text` and `styles.card` read the theme in force at render
 * time, so switching themes re-colours every component that re-renders, with
 * no restart and no lost state. Components re-render on a switch by calling
 * `useTheme()`.
 */
export { fonts, fontScaleCap, layout, palettes, radii, spacing, typeScale };
export type { Palette, ThemeName, TypeStyle } from './tokens';

let activeTheme: ThemeName = 'dark';

/** Set by the theme provider before its subtree renders. */
export function setActiveTheme(name: ThemeName) {
  activeTheme = name;
}

export function getActiveTheme(): ThemeName {
  return activeTheme;
}

/**
 * A read-through view of an object chosen at read time: property reads,
 * spreads and `Object.keys` all see the current one.
 */
function readThrough<T extends object>(current: () => T): T {
  return new Proxy({} as T, {
    get: (_, key) => Reflect.get(current(), key),
    has: (_, key) => Reflect.has(current(), key),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, key) => {
      const value = Reflect.get(current(), key);
      return value === undefined
        ? undefined
        : { value, enumerable: true, configurable: true, writable: false };
    },
  });
}

/** The active theme's palette. */
export const colors: Palette = readThrough(() => palettes[activeTheme]);

/**
 * `StyleSheet.create` for themed styles: `factory` reads `colors`, and is run
 * (once per theme, then cached) for the theme active when a style is read.
 */
type StyleObject = Parameters<typeof StyleSheet.create>[0];

export function createStyles<S extends StyleObject>(factory: () => S & StyleObject): Readonly<S> {
  const cache: Partial<Record<ThemeName, Readonly<S>>> = {};
  return readThrough(() => (cache[activeTheme] ??= StyleSheet.create(factory())));
}

export interface ThemeContextValue {
  /** The theme drawn now. */
  scheme: ThemeName;
  /** Keyboard to ask text fields for (spec 0038 FR-12). */
  keyboardAppearance: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'dark',
  keyboardAppearance: 'dark',
});

/**
 * The theme in force. Every component that draws with `colors` or themed
 * styles calls it, so a theme switch re-renders it in place (FR-19).
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Shared navigation header styling so every stack matches the theme. */
export const screenHeader = readThrough(() => ({
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: typeScale.body.fontSize,
  },
}));

export const fontAssets = {
  [fonts.display]: require('../../assets/fonts/SpaceGrotesk-Medium.ttf'),
  [fonts.displayBold]: require('../../assets/fonts/SpaceGrotesk-Bold.ttf'),
};

export const commonStyles = createStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: layout.floatingBarClearance,
    gap: spacing.lg,
  },
  fixedContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  // Text roles: each one is a style of the type scale plus colour and emphasis.
  /** Large title of a tab's root screen or a hero. */
  title: {
    ...typeScale.title,
    color: colors.text,
    letterSpacing: -0.5,
  },
  /** Title of a screen section, a sheet or a detail screen's hero. */
  heading: {
    ...typeScale.heading,
    color: colors.text,
    letterSpacing: -0.2,
  },
  /** Title of a card or a block inside a screen. */
  cardTitle: {
    ...typeScale.heading,
    color: colors.text,
  },
  /** Small uppercase label above a section or a figure. */
  sectionLabel: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /**
   * Header of a narrow table column ("Set", "Previous", "kg"). Sentence case
   * and no tracking, so Caption fits the set row's fixed columns.
   */
  columnLabel: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  figure: {
    ...typeScale.figure,
    color: colors.text,
  },
  figureLarge: {
    ...typeScale.figureLarge,
    color: colors.text,
    letterSpacing: -0.5,
  },
  /** Unit or small text set next to a figure ("kg", "reps"). */
  figureUnit: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontFamily: fonts.display,
  },
  body: {
    ...typeScale.body,
    color: colors.textMuted,
  },
  /** Secondary line: dates, counts, hints. */
  meta: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  /** A row's title or value. */
  label: {
    ...typeScale.body,
    color: colors.text,
    fontWeight: '700',
  },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typeScale.body.fontSize,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typeScale.body,
    color: colors.onPrimary,
    fontFamily: fonts.displayBold,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
  },
  link: {
    ...typeScale.body,
    color: colors.primary,
    fontWeight: '700',
  },
  error: {
    ...typeScale.caption,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
}));
