import { StyleSheet } from 'react-native';

import { colors, fonts, fontScaleCap, layout, radii, spacing, typeScale } from './tokens';

/**
 * Screens import the tokens from here (the values live in `tokens.ts`, the
 * only file where they are written — spec 0034 FR-10 – FR-12) together with
 * the shared styles built on them.
 */
export { colors, fonts, fontScaleCap, layout, radii, spacing, typeScale };
export type { TypeStyle } from './tokens';

export const fontAssets = {
  [fonts.display]: require('../../assets/fonts/SpaceGrotesk-Medium.ttf'),
  [fonts.displayBold]: require('../../assets/fonts/SpaceGrotesk-Bold.ttf'),
};

/** Shared navigation header styling so every stack matches the dark theme. */
export const screenHeader = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: typeScale.body.fontSize,
  },
};

export const commonStyles = StyleSheet.create({
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
});
