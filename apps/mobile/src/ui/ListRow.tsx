import { Ionicons } from '@expo/vector-icons';
import { isValidElement, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface ListRowProps {
  title: string;
  /** Secondary line (muscles, a date, a count). */
  subtitle?: string;
  subtitleLines?: number;
  /** An icon name draws a 40 pt tile; any node (a thumbnail) is used as is. */
  leading?: IconName | ReactNode;
  /** A value drawn as a figure, or any node (a toggle, a star button). */
  trailing?: string | ReactNode;
  /** A chevron after the trailing piece: the row leads somewhere. */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** `card`: the row is its own card. `plain`: a row inside a card. */
  variant?: 'card' | 'plain';
  /** Plain rows in a list: a rule above and vertical room. */
  divider?: boolean;
  accessibilityLabel?: string;
}

/**
 * One row of a list (spec 0034 FR-13): leading tile or icon, a title that
 * wraps (0017 FR-7), a secondary line, a trailing value or chevron. The whole
 * row is the touch target, at least 44 pt tall.
 */
export function ListRow({
  title,
  subtitle,
  subtitleLines = 1,
  leading,
  trailing,
  chevron = false,
  onPress,
  disabled = false,
  variant = 'plain',
  divider = false,
  accessibilityLabel,
}: ListRowProps) {
  useTheme();
  const content = (
    <>
      {typeof leading === 'string' ? (
        <View style={styles.tile}>
          <Ionicons name={leading as IconName} size={20} color={colors.textMuted} />
        </View>
      ) : isValidElement(leading) ? (
        leading
      ) : null}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={commonStyles.meta} numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? <Text style={styles.value}>{trailing}</Text> : trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </>
  );
  const rowStyle = [
    styles.row,
    variant === 'card' ? styles.card : null,
    divider ? styles.divider : null,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed ? commonStyles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = createStyles(() => ({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  divider: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  title: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
  },
  value: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
}));
