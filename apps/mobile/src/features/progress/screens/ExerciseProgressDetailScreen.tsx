import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { progressClient } from '@/features/progress/api/progressClient';
import { buildProgressSeries } from '@/features/progress/utils/chartData';
import { extractPersonalRecords } from '@/features/progress/utils/personalRecords';
import { formatDate, formatShortDate } from '@/lib/format';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { ExerciseProgressDetail } from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

export function ExerciseProgressDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [progress, setProgress] = useState<ExerciseProgressDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setProgress(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing exercise id.');
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
              : 'Progress data is not available for this exercise yet.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [exerciseId],
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
        <Text style={styles.meta}>Loading progress...</Text>
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>
          {errorMessage ?? 'Progress data is not available for this exercise yet.'}
        </Text>
        <Link href="/progress" style={styles.link}>
          Back to progress
        </Link>
      </View>
    );
  }

  const oneRepMaxSeries = buildProgressSeries(
    progress.points,
    'estimatedOneRepMax',
  );
  const volumeSeries = buildProgressSeries(progress.points, 'totalVolume');
  const personalRecords = extractPersonalRecords(progress.points);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>{progress.exerciseName}</Text>
      <Text style={styles.meta}>
        Latest: {formatValue(progress.latestWeightKg)} kg x{' '}
        {formatValue(progress.latestReps)}
      </Text>
      <Text style={styles.meta}>
        Personal best: {formatValue(progress.personalBestWeightKg)} kg x{' '}
        {formatValue(progress.personalBestReps)}
      </Text>
      <Text style={styles.meta}>
        Est. 1RM: {formatValue(progress.bestEstimatedOneRepMax)} kg -{' '}
        {progress.sessionCount} sessions
        {progress.isRecordSession ? ' - recent PR' : ''}
      </Text>
      {oneRepMaxSeries.bars.length > 0 ? (
        <ProgressChart
          title="Estimated 1RM"
          unit="kg"
          series={oneRepMaxSeries}
          formatLabel={formatShortDate}
        />
      ) : volumeSeries.bars.length > 0 ? (
        <ProgressChart
          title="Volume per session"
          unit="kg"
          series={volumeSeries}
          formatLabel={formatShortDate}
        />
      ) : null}
      {personalRecords.length > 0 ? (
        <View style={styles.records}>
          <Text style={styles.sectionTitle}>Personal records</Text>
          {personalRecords
            .slice()
            .reverse()
            .map((record, index) => (
              <View key={`${record.date}-${index}`} style={styles.recordRow}>
                <Text style={styles.recordBadge}>🏆</Text>
                <Text style={styles.recordText}>
                  {record.weightKg} kg
                  {record.reps !== undefined ? ` x ${record.reps}` : ''} -{' '}
                  {formatDate(record.date)}
                </Text>
              </View>
            ))}
        </View>
      ) : null}
      <View style={styles.list}>
        {progress.points
          .slice()
          .reverse()
          .map((point, index) => (
            <View key={`${point.date}-${index}`} style={styles.card}>
              <Text style={styles.cardTitle}>{formatDate(point.date)}</Text>
              <Text style={styles.meta}>
                Best: {formatValue(point.bestWeightKg)} kg x{' '}
                {formatValue(point.bestReps)} - Volume {point.totalVolume} - 1RM{' '}
                {formatValue(point.estimatedOneRepMax)}
              </Text>
            </View>
          ))}
      </View>
      <Link href="/progress" style={styles.link}>
        Back to progress
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
