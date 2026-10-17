import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatWeightValue } from '@/lib/weight';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';
import type { MuscleGroupVolumePoint, WeightUnit } from '@workout/domain';

interface MuscleDistributionProps {
  points: MuscleGroupVolumePoint[];
  /** Display unit; volumes arrive in kg (Article 4). */
  unit: WeightUnit;
}

/** Horizontal volume-by-muscle-group bars (proportional to the top group). */
export function MuscleDistribution({ points, unit }: MuscleDistributionProps) {
  const { t } = useTranslation();

  if (points.length === 0) {
    return null;
  }

  const max = Math.max(...points.map((point) => point.totalVolume));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('progress.volumeByCategory')}</Text>
      {points.map((point) => (
        <View key={point.group} style={styles.row}>
          <Text numberOfLines={1} style={styles.label}>
            {point.group}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.max(4, (point.totalVolume / max) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.value}>{`${formatWeightValue(point.totalVolume, unit)} ${unit}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  title: {
    ...commonStyles.cardTitle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 88,
    color: colors.text,
    ...typeScale.caption,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.textMuted,
  },
  value: {
    width: 80,
    textAlign: 'right',
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
});
