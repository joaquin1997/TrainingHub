import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';

/**
 * Tones follow the colour meanings of spec 0017 FR-1: `record` (orange) for a
 * personal record or a failure set, `done` (green) for done items, `primary`
 * (lime) for the active/selected state. `neutral` is everything else.
 */
export type ChipTone = 'neutral' | 'primary' | 'record' | 'done' | 'danger';

interface ChipProps {
  label: string;
  tone?: ChipTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Filter chips: the selected one is filled lime. */
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

const toneColors: Record<ChipTone, { background: string; text: string }> = {
  neutral: { background: colors.surfaceRaised, text: colors.textMuted },
  primary: { background: colors.primarySoft, text: colors.primary },
  record: { background: colors.accentSoft, text: colors.accent },
  done: { background: colors.successSoft, text: colors.success },
  danger: { background: colors.dangerSoft, text: colors.danger },
};

/** The one pill style for tags, filters and set types (spec 0017 FR-4). */
export function Chip({
  label,
  tone = 'neutral',
  icon,
  selected = false,
  onPress,
  size = 'md',
}: ChipProps) {
  const palette = selected
    ? { background: colors.primary, text: colors.onPrimary }
    : toneColors[tone];
  const content = (
    <>
      {icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 12 : 14} color={palette.text} />
      ) : null}
      <Text
        style={[styles.label, size === 'sm' ? styles.labelSmall : null, { color: palette.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </>
  );
  const chipStyle = [
    styles.chip,
    size === 'sm' ? styles.chipSmall : null,
    { backgroundColor: palette.background },
    tone === 'neutral' && !selected ? styles.neutralBorder : null,
  ];

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [...chipStyle, styles.pressable, pressed ? commonStyles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pressable: {
    minHeight: 36,
  },
  neutralBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  labelSmall: {
    fontSize: 12,
  },
});
