import type { TextStyle } from 'react-native';

/**
 * The design tokens: the only file where a colour, a text size, a corner
 * radius or a spacing value is written as a number or a literal (spec 0034
 * FR-10 – FR-12). Pure data, so tests can read it; screens import it through
 * `theme.ts`. The check in `styleScale.test.ts` fails on such a literal
 * anywhere else in `src/`.
 */

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
  /** Placeholders, captions, chevrons: ≥ 4.5:1 on every surface and tint (0034 FR-16). */
  textSubtle: '#8E9BAE',
  border: '#2C3543',
  borderStrong: '#3D4A5C',
  /** Edge of a control whose fill does not set it apart, e.g. the undone done box (≥ 3:1). */
  controlBorder: '#6C7A8F',
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

/**
 * Closed spacing scale (spec 0034 FR-11): the six steps of 0017 plus `xxs` and
 * `xxxl`. Every padding, margin and gap is one of these, or 0.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Closed shape scale (spec 0034 FR-11). `pill` rounds the ends of a bar or a
 * chip; `round` makes a square a circle (React Native clamps the radius to
 * half the side).
 */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
  round: 999,
};

/**
 * Sizes that are not spacing steps but must line up across components: an
 * offset equal to a fixed column's width, the room kept under a scroll view
 * for the floating bars.
 */
export const layout = {
  /** Width of the set marker column of a set row (and the indent under it). */
  setMarker: 36,
  /** Bottom room of a scroll view's content, above the floating bars. */
  floatingBarClearance: 96,
};

/** Fixed-width digits, so a running clock or a changing weight never shifts. */
const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * The closed type scale (spec 0034 FR-10): exactly six styles. Every text in
 * the app takes its size and line height from one of them — a role may add
 * emphasis (weight, case, letter spacing, colour, the display face) but never
 * a size of its own. The display face is for titles and figures, the system
 * face for body text (0017 FR-2); figures keep fixed-width digits.
 */
export const typeScale = {
  /** Large titles of tab roots and heroes. */
  title: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36 },
  /** Card and section titles. */
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26 },
  /** Prose, row titles, inputs, buttons. */
  body: { fontSize: 16, lineHeight: 22 },
  /** Secondary text, section labels, column headers, chips — the smallest text. */
  caption: { fontSize: 13, lineHeight: 18 },
  /** The key figure of a screen: the workout clock, a hero figure. */
  figureLarge: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 46,
    fontVariant: tabular,
  },
  /** Other figures: tiles, set inputs, the rest clock, chart values. */
  figure: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    lineHeight: 26,
    fontVariant: tabular,
  },
} satisfies Record<string, TextStyle>;

export type TypeStyle = keyof typeof typeScale;

/**
 * Largest system text scale some text follows (spec 0034 FR-18). Body and
 * caption text grow without a cap; only figures and labels that sit in a
 * fixed-width column or a one-line bar stop growing, so they never overlap
 * the done target or push a control off screen (EF-8).
 */
export const fontScaleCap = {
  /** Set row columns (36 / 64 / 44 pt), the rest bar, the workout bar. */
  fixedColumn: 1.3,
  /** The workout clock beside its Pause button. */
  largeFigure: 1.5,
};
