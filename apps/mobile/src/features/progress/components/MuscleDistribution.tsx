import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { categoryLabel } from '@/features/exercises/utils/catalogLabels';
import { formatWeightValue } from '@/lib/weight';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';
import type { MuscleGroupVolumePoint, WeightUnit } from '@workout/domain';

interface MuscleDistributionProps {
  points: MuscleGroupVolumePoint[];
  /** Display unit; volumes arrive in kg (Article 4). */
  unit: WeightUnit;
}

/** Horizontal volume-by-muscle-group bars (proportional to the top group). */
export function MuscleDistribution({ points, unit }: MuscleDistributionProps) {
  useTheme();
  const { t } = useTranslation();

  if (points.length === 0) {
    return null;
  }

  const max = Math.max(...points.map((point) => point.totalVolume));

  return (
    <View style={styles.container}>
      <CardHeader title={t('progress.volumeByCategory')} />
      {points.map((point) => (
        <View key={point.group} style={styles.row}>
          <Text numberOfLines={1} style={styles.label}>
            {categoryLabel(point.group, t)}
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

const styles = createStyles(() => ({
  container: {
    ...commonStyles.card,
    gap: spacing.md,
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
}));
