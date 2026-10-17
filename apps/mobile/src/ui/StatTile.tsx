import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, commonStyles, fontScaleCap, radii, spacing, typeScale } from '@/ui/theme';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  /** Small line under the figure. */
  caption?: string;
  /** Icon before the caption, e.g. the arrow of a comparison (spec 0034 FR-24). */
  captionIcon?: keyof typeof Ionicons.glyphMap;
  /** `success` draws the caption green (an increase); default muted. */
  captionTone?: 'muted' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
  /** `record` draws the figure orange (a personal record, FR-1). */
  tone?: 'neutral' | 'record';
}

/** Label + figure + unit; tiles sit in rows of two or three (spec 0017). */
export function StatTile({
  label,
  value,
  unit,
  caption,
  captionIcon,
  captionTone = 'muted',
  icon,
  tone = 'neutral',
}: StatTileProps) {
  const figureColor = tone === 'record' ? colors.accent : colors.text;
  const captionColor = captionTone === 'success' ? colors.success : colors.textMuted;

  return (
    <View style={styles.tile}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
      </View>
      <Text style={styles.valueLine}>
        <Text
          maxFontSizeMultiplier={fontScaleCap.fixedColumn}
          style={[styles.value, { color: figureColor }]}
        >
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{` ${unit}`}</Text> : null}
      </Text>
      {caption && captionIcon ? (
        <View style={styles.captionRow}>
          <Ionicons name={captionIcon} size={14} color={captionColor} />
          <Text style={[styles.caption, styles.captionText, { color: captionColor }]} numberOfLines={2}>
            {caption}
          </Text>
        </View>
      ) : caption ? (
        <Text style={[styles.caption, { color: captionColor }]} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  label: {
    ...commonStyles.sectionLabel,
    flexShrink: 1,
  },
  valueLine: {
    flexDirection: 'row',
  },
  value: {
    ...commonStyles.figure,
  },
  unit: {
    ...commonStyles.figureUnit,
  },
  caption: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  captionText: {
    flex: 1,
  },
});
