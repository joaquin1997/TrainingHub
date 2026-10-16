import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';

/**
 * `primary` is the screen's one primary action (spec 0017 FR-6); `ghost` is a
 * text-only action, used for discard/delete links and minor actions.
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: PressableProps['onPress'];
  variant?: ButtonVariant;
  /** Leading icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Ghost buttons only: draw the label in the destructive colour. */
  destructive?: boolean;
  disabled?: boolean;
  /** Stretch to the container width instead of hugging the label. */
  fullWidth?: boolean;
  style?: ViewStyle;
}

const labelColor: Record<ButtonVariant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  danger: colors.danger,
  ghost: colors.textMuted,
};

/**
 * Shared button used across screens. Wraps a plain Pressable (not Link asChild,
 * which drops a function style in this Expo Router version) — for navigation,
 * call router.push in onPress.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  destructive = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const color = destructive ? colors.danger : labelColor[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
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
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    flexShrink: 1,
    textAlign: 'center',
  },
});
