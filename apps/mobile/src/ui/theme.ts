import { StyleSheet, type TextStyle } from 'react-native';

/**
 * Accent colours carry one meaning each (spec 0017 FR-1): `primary` (lime) is
 * the primary action and the active/selected state, `accent` (orange) a
 * personal record or a failure set, `success` (green) a done set, `danger`
 * (red) destructive actions and errors.
 */
export const colors = {
  background: '#101418',
  surface: '#151A21',
  surfaceRaised: '#1D2530',
  surfaceMuted: '#101820',
  primary: '#C8FF2E',
  primaryPressed: '#A9E51F',
  primarySoft: 'rgba(200, 255, 46, 0.12)',
  onPrimary: '#10140D',
  accent: '#FF8A3D',
  accentSoft: 'rgba(255, 138, 61, 0.16)',
  success: '#66E287',
  successSoft: 'rgba(102, 226, 135, 0.14)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  text: '#F7FAF2',
  textMuted: '#A7B0BE',
  textSubtle: '#6E7B8E',
  border: '#2C3543',
  borderStrong: '#3D4A5C',
  overlay: 'rgba(4, 8, 13, 0.76)',
  /** Behind catalog images, which are line drawings on white. */
  imageBackdrop: '#FFFFFF',
};

/**
 * Display typeface for titles and figures (spec 0017 FR-2), loaded at start-up
 * by the root layout from `assets/fonts`. Body text stays in the system face.
 * Custom faces carry their weight in the file, so styles using them set no
 * `fontWeight` (Android would otherwise fall back to the system face).
 */
export const fonts = {
  display: 'SpaceGrotesk-Medium',
  displayBold: 'SpaceGrotesk-Bold',
};

export const fontAssets = {
  [fonts.display]: require('../../assets/fonts/SpaceGrotesk-Medium.ttf'),
  [fonts.displayBold]: require('../../assets/fonts/SpaceGrotesk-Bold.ttf'),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

/** Fixed-width digits, so a running clock or a changing weight never shifts. */
const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** Shared navigation header styling so every stack matches the dark theme. */
export const screenHeader = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 17 },
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  fixedContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  /** Large title of a tab's root screen. */
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  /** Title of a card or a block inside a screen. */
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 24,
  },
  /** Small uppercase label above a section or a figure. */
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  figure: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: tabular,
  },
  figureLarge: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    fontVariant: tabular,
  },
  /** Unit or small text set next to a figure ("kg", "reps"). */
  figureUnit: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 14,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.text,
    fontSize: 14,
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
    paddingVertical: 12,
    fontSize: 16,
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
    color: colors.onPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 16,
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
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
