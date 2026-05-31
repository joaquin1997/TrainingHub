import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MuscleDistribution } from '@/features/progress/components/MuscleDistribution';
import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { progressClient } from '@/features/progress/api/progressClient';
import { buildWeeklyVolumeSeries } from '@/features/progress/utils/chartData';
import { formatShortDate } from '@/lib/format';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type {
  ExerciseProgressSummary,
  MuscleGroupVolumePoint,
  WeeklyVolumePoint,
} from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

export function ProgressOverviewScreen() {
  const [progress, setProgress] = useState<ExerciseProgressSummary[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePoint[]>([]);
  const [muscleVolume, setMuscleVolume] = useState<MuscleGroupVolumePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const [nextProgress, nextWeeklyVolume, nextMuscleVolume] =
          await Promise.all([
            progressClient.list(),
            progressClient.weeklyVolume(),
            progressClient.muscleDistribution(),
          ]);

        if (shouldUpdate()) {
          setProgress(nextProgress);
          setWeeklyVolume(nextWeeklyVolume);
          setMuscleVolume(nextMuscleVolume);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load progress.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadProgress(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadProgress]),
  );

  const { isRefreshing, onRefresh } = useRefresh(loadProgress);
  const weeklyVolumeSeries = buildWeeklyVolumeSeries(weeklyVolume);
  const showLoading = isLoading && progress.length === 0;
  const hasEmptyState = !isLoading && !errorMessage && progress.length === 0;
  const hasListState = !errorMessage && progress.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Progress Overview</Text>
      <Text style={styles.body}>
        Review your strongest recent lifts and see which exercises are moving.
      </Text>
      {weeklyVolumeSeries.bars.length > 0 ? (
        <ProgressChart
          title="Weekly volume"
          unit="kg"
          series={weeklyVolumeSeries}
          formatLabel={formatShortDate}
        />
      ) : null}
      <MuscleDistribution points={muscleVolume} />
      {showLoading ? (
        <View style={styles.card}>
          <Text style={styles.meta}>Loading progress...</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : null}
      {hasEmptyState ? (
        <View style={styles.card}>
          <Text style={styles.meta}>No progress yet.</Text>
          <Text style={styles.meta}>Finish a workout to start tracking.</Text>
        </View>
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          {progress.map((exercise) => (
            <Link
              key={exercise.exerciseId}
              href={`/progress/exercises/${exercise.exerciseId}`}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
                  {exercise.isRecordSession ? (
                    <Text style={styles.prBadge}>PR</Text>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  Latest: {formatValue(exercise.latestWeightKg)} kg x{' '}
                  {formatValue(exercise.latestReps)}
                </Text>
                <Text style={styles.meta}>
                  Best: {formatValue(exercise.personalBestWeightKg)} kg x{' '}
                  {formatValue(exercise.personalBestReps)}
                </Text>
                <Text style={styles.meta}>
                  Est. 1RM: {formatValue(exercise.bestEstimatedOneRepMax)} kg -{' '}
                  {exercise.sessionCount} sessions
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
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
    ...commonStyles.body,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  prBadge: {
    color: colors.onPrimary,
    backgroundColor: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
});
