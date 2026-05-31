import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0B0F14',
  surface: '#151A21',
  surfaceRaised: '#1D2530',
  surfaceMuted: '#101820',
  primary: '#C8FF2E',
  primaryPressed: '#A9E51F',
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
  sm: 6,
  md: 8,
  lg: 10,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  fixedContent: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0,
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
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 44,
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
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
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
