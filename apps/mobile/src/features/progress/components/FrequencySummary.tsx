import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { TrainingFrequencySummary } from '@/features/progress/utils/trainingFrequency';
import { colors, radii, spacing } from '@/ui/theme';

interface FrequencySummaryProps {
  summary: TrainingFrequencySummary;
}

/** Compact stat tiles for training frequency (streak, totals, best week). */
export function FrequencySummary({ summary }: FrequencySummaryProps) {
  const { t } = useTranslation();

  if (summary.totalWorkouts === 0) {
    return null;
  }

  const tiles = [
    { label: t('progress.freqWeekStreak'), value: summary.currentStreak },
    { label: t('progress.freqWorkouts'), value: summary.totalWorkouts },
    { label: t('progress.freqActiveWeeks'), value: summary.activeWeeks },
    { label: t('progress.freqBestWeek'), value: summary.bestWeek },
  ];

  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <Text style={styles.value}>{tile.value}</Text>
          <Text numberOfLines={1} style={styles.label}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  value: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
