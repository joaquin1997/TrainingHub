import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, commonStyles, spacing, typeScale } from '@/ui/theme';

interface CardHeaderProps {
  title: string;
  /** Secondary line under the title: a date, a count, a status. */
  caption?: string;
  /** A small icon before the title, centred on its first line. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Before the title, instead of `icon`: a numbered badge, an icon tile. */
  leading?: ReactNode;
  /** After the title: a chevron, a menu button, a chip, a value. Keeps its own width. */
  trailing?: ReactNode;
  /** `body` for headers inside dense cards (an exercise inside a list of sets). */
  size?: 'heading' | 'body';
  /** Extra content under the title line, inside the text column (chips). */
  children?: ReactNode;
}

/**
 * The title line of a card (spec 0034 FR-13): title (wraps, 0017 FR-7),
 * optional caption, optional leading and trailing pieces. Every card's header
 * is drawn by this block.
 */
export function CardHeader({
  title,
  caption,
  icon,
  leading,
  trailing,
  size = 'heading',
  children,
}: CardHeaderProps) {
  const lineHeight = (size === 'body' ? typeScale.body : typeScale.heading).lineHeight;

  return (
    // A single title line centres its neighbours; with more lines they stay at the top.
    <View style={[styles.row, caption || children ? styles.rowTop : null]}>
      {icon ? (
        <View style={[styles.icon, { height: lineHeight }]}>
          <Ionicons name={icon} size={18} color={colors.textMuted} />
        </View>
      ) : (
        leading
      )}
      <View style={styles.text}>
        <Text
          accessibilityRole="header"
          style={[styles.title, size === 'body' ? styles.titleBody : null]}
        >
          {title}
        </Text>
        {caption ? <Text style={commonStyles.meta}>{caption}</Text> : null}
        {children}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTop: {
    alignItems: 'flex-start',
  },
  icon: {
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  title: {
    ...commonStyles.cardTitle,
  },
  titleBody: {
    ...typeScale.body,
  },
});
