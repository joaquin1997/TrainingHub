import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, commonStyles, radii, spacing } from '@/ui/theme';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  /** Small line under the figure. */
  caption?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** `record` draws the figure orange (a personal record, FR-1). */
  tone?: 'neutral' | 'record';
}

/** Label + figure + unit; tiles sit in rows of two or three (spec 0017). */
export function StatTile({ label, value, unit, caption, icon, tone = 'neutral' }: StatTileProps) {
  const figureColor = tone === 'record' ? colors.accent : colors.text;

  return (
    <View style={styles.tile}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
      </View>
      <Text style={styles.valueLine}>
        <Text style={[styles.value, { color: figureColor }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{` ${unit}`}</Text> : null}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
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
    fontSize: 11,
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
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
});
