import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

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

/** Read at render time, so it follows the theme (spec 0038). */
const toneColors = (): Record<ChipTone, { background: string; text: string }> => ({
  neutral: { background: colors.surfaceRaised, text: colors.textMuted },
  primary: { background: colors.primarySoft, text: colors.primaryInk },
  record: { background: colors.accentSoft, text: colors.accentInk },
  done: { background: colors.successSoft, text: colors.successInk },
  danger: { background: colors.dangerSoft, text: colors.dangerInk },
});

/** The one pill style for tags, filters and set types (spec 0017 FR-4). */
export function Chip({
  label,
  tone = 'neutral',
  icon,
  selected = false,
  onPress,
  size = 'md',
}: ChipProps) {
  useTheme();
  const palette = selected
    ? { background: colors.primary, text: colors.onPrimary }
    : toneColors()[tone];
  const content = (
    <>
      {icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 12 : 14} color={palette.text} />
      ) : null}
      <Text
        style={[styles.label, { color: palette.text }]}
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

const styles = createStyles(() => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pressable: {
    minHeight: 36,
  },
  neutralBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Both sizes use Caption (the closed scale has no smaller text); the small
  // chip is set apart by its tighter padding.
  label: {
    ...typeScale.caption,
    fontFamily: fonts.display,
    fontVariant: ['tabular-nums'],
  },
}));
