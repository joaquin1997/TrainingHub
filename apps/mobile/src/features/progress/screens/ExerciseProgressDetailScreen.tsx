import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { progressClient } from '@/features/progress/api/progressClient';
import { formatDate } from '@/lib/format';
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
        <Text style={styles.title}>Exercise Progress</Text>
        <Text style={styles.meta}>Loading progress...</Text>
        <RouteLinks currentRoute="progress" />
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercise Progress</Text>
        <Text style={styles.body}>
          {errorMessage ?? 'Progress data is not available for this exercise yet.'}
        </Text>
        <Link href="/progress" style={styles.link}>
          Back to progress
        </Link>
        <RouteLinks currentRoute="progress" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Exercise Progress</Text>
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
      <RouteLinks currentRoute="progress" />
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
