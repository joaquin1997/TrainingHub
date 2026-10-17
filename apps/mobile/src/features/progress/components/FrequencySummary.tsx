import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { TrainingFrequencySummary } from '@/features/progress/utils/trainingFrequency';
import { StatTile } from '@/ui/StatTile';
import { createStyles, spacing, useTheme } from '@/ui/theme';

interface FrequencySummaryProps {
  summary: TrainingFrequencySummary;
}

/** Stat tiles for training frequency (streak, totals, best week), two by two. */
export function FrequencySummary({ summary }: FrequencySummaryProps) {
  useTheme();
  const { t } = useTranslation();

  if (summary.totalWorkouts === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatTile icon="flame-outline" label={t('progress.freqWeekStreak')} value={String(summary.currentStreak)} />
        <StatTile icon="calendar-outline" label={t('progress.freqWorkouts')} value={String(summary.totalWorkouts)} />
      </View>
      <View style={styles.row}>
        <StatTile icon="checkmark-done-outline" label={t('progress.freqActiveWeeks')} value={String(summary.activeWeeks)} />
        <StatTile icon="trophy-outline" label={t('progress.freqBestWeek')} value={String(summary.bestWeek)} />
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
}));
