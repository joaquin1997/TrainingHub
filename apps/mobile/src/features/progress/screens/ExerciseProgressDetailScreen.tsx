import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { progressClient } from '@/features/progress/api/progressClient';
import { buildProgressSeries } from '@/features/progress/utils/chartData';
import { extractPersonalRecords } from '@/features/progress/utils/personalRecords';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDate, formatShortDate } from '@/lib/format';
import { formatWeightValue, fromKg, roundWeight } from '@/lib/weight';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { ExerciseProgressDetail, WeightUnit } from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

/** kg → rounded display-unit number (used for charted/volume values). */
function toDisplay(kg: number, unit: WeightUnit) {
  return roundWeight(fromKg(kg, unit));
}

export function ExerciseProgressDetailScreen() {
  const { t } = useTranslation();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [progress, setProgress] = useState<ExerciseProgressDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setProgress(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage(t('exercises.missingId'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextProgress = await progressClient.getByExerciseId(exerciseId);

        if (shouldUpdate()) {
          setProgress(nextProgress);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t('progress.notAvailable'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [exerciseId, t],
  );

  useEffect(() => {
    let isActive = true;

    void loadProgress(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadProgress]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>{t('progress.loading')}</Text>
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>
          {errorMessage ?? t('progress.notAvailable')}
        </Text>
        <Link href="/progress" style={styles.link}>
          {t('progress.backToProgress')}
        </Link>
      </View>
    );
  }

  // Convert the kg-scaled metrics into the user's display unit up front so the
  // charts, records and per-session list all read in the same unit.
  const displayPoints = progress.points.map((point) => ({
    ...point,
    bestWeightKg:
      point.bestWeightKg !== undefined
        ? toDisplay(point.bestWeightKg, unit)
        : point.bestWeightKg,
    totalVolume:
      point.totalVolume !== undefined
        ? toDisplay(point.totalVolume, unit)
        : point.totalVolume,
    estimatedOneRepMax:
      point.estimatedOneRepMax !== undefined
        ? toDisplay(point.estimatedOneRepMax, unit)
        : point.estimatedOneRepMax,
  }));

  const oneRepMaxSeries = buildProgressSeries(
    displayPoints,
    'estimatedOneRepMax',
  );
  const volumeSeries = buildProgressSeries(displayPoints, 'totalVolume');
  const personalRecords = extractPersonalRecords(progress.points);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>{progress.exerciseName}</Text>
      <Text style={styles.meta}>
        {t('progress.latest', {
          weight: formatWeightValue(progress.latestWeightKg, unit),
          unit,
          reps: formatValue(progress.latestReps),
        })}
      </Text>
      <Text style={styles.meta}>
        {t('progress.personalBest', {
          weight: formatWeightValue(progress.personalBestWeightKg, unit),
          unit,
          reps: formatValue(progress.personalBestReps),
        })}
      </Text>
      <Text style={styles.meta}>
        {t('progress.est1rm', {
          weight: formatWeightValue(progress.bestEstimatedOneRepMax, unit),
          unit,
          count: progress.sessionCount,
        })}
        {progress.isRecordSession ? t('progress.recentPr') : ''}
      </Text>
      {oneRepMaxSeries.bars.length > 0 ? (
        <ProgressChart
          title={t('progress.estimated1rm')}
          unit={unit}
          series={oneRepMaxSeries}
          formatLabel={formatShortDate}
        />
      ) : volumeSeries.bars.length > 0 ? (
        <ProgressChart
          title={t('progress.volumePerSession')}
          unit={unit}
          series={volumeSeries}
          formatLabel={formatShortDate}
        />
      ) : null}
      {personalRecords.length > 0 ? (
        <View style={styles.records}>
          <Text style={styles.sectionTitle}>{t('progress.personalRecords')}</Text>
          {personalRecords
            .slice()
            .reverse()
            .map((record, index) => (
              <View key={`${record.date}-${index}`} style={styles.recordRow}>
                <Text style={styles.recordBadge}>🏆</Text>
                <Text style={styles.recordText}>
                  {t('progress.recordLine', {
                    weight: formatWeightValue(record.weightKg, unit),
                    unit,
                    reps: record.reps !== undefined ? ` x ${record.reps}` : '',
                    date: formatDate(record.date),
                  })}
                </Text>
              </View>
            ))}
        </View>
      ) : null}
      <View style={styles.list}>
        {displayPoints
          .slice()
          .reverse()
          .map((point, index) => (
            <View key={`${point.date}-${index}`} style={styles.card}>
              <Text style={styles.cardTitle}>{formatDate(point.date)}</Text>
              <Text style={styles.meta}>
                {t('progress.sessionBest', {
                  bestWeight: formatValue(point.bestWeightKg),
                  bestReps: formatValue(point.bestReps),
                  volume: formatValue(point.totalVolume),
                  oneRepMax: formatValue(point.estimatedOneRepMax),
                  unit,
                })}
              </Text>
            </View>
          ))}
      </View>
      <Link href="/progress" style={styles.link}>
        {t('progress.backToProgress')}
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  records: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordBadge: {
    fontSize: 14,
  },
  recordText: {
    color: colors.textMuted,
    fontSize: 14,
    flexShrink: 1,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    ...commonStyles.meta,
  },
  link: {
    ...commonStyles.link,
  },
});
