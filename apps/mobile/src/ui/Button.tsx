import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { colors, commonStyles, radii, spacing } from '@/ui/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: PressableProps['onPress'];
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Stretch to the container width instead of hugging the label. */
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Shared button used across screens. Wraps a plain Pressable (not Link asChild,
 * which drops a function style in this Expo Router version) — for navigation,
 * call router.push in onPress.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth ? styles.fullWidth : null,
        pressed ? commonStyles.pressed : null,
        disabled ? commonStyles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  secondaryLabel: {
    color: colors.text,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
