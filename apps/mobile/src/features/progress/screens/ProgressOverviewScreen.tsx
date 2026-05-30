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

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { progressClient } from '@/features/progress/api/progressClient';
import { useRefresh } from '@/lib/useRefresh';
import type { ExerciseProgressSummary } from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '—' : String(value);
}

export function ProgressOverviewScreen() {
  const [progress, setProgress] = useState<ExerciseProgressSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextProgress = await progressClient.list();

        if (shouldUpdate()) {
          setProgress(nextProgress);
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
        Per-exercise progress aggregated from your saved workouts.
      </Text>
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
                <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
                <Text style={styles.meta}>
                  Latest: {formatValue(exercise.latestWeightKg)} kg x{' '}
                  {formatValue(exercise.latestReps)}
                </Text>
                <Text style={styles.meta}>
                  Best: {formatValue(exercise.personalBestWeightKg)} kg x{' '}
                  {formatValue(exercise.personalBestReps)}
                </Text>
                <Text style={styles.meta}>{exercise.sessionCount} sessions</Text>
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
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
});
