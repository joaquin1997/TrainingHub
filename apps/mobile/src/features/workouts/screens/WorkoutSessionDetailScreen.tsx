import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import {
  durationSecondsBetween,
  formatDateTime,
  formatDuration,
} from '@/lib/format';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { WorkoutSession } from '@workout/domain';

export function WorkoutSessionDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadSession = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setSession(null);
      }

      if (!workoutId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing workout id.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextSession = await workoutsClient.getById(workoutId);

        if (shouldUpdate()) {
          if (!nextSession) {
            setErrorMessage('Workout not found.');
            return;
          }

          setSession(nextSession);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load workout.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [workoutId],
  );

  useEffect(() => {
    let isActive = true;

    void loadSession(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadSession]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>Loading workout...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          {errorMessage ?? 'Workout not found.'}
        </Text>
        <Link href="/history" style={styles.link}>
          Back to history
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>
        {formatDateTime(session.completedAt ?? session.startedAt)}
      </Text>
      <Text style={styles.meta}>
        {session.status} - {session.exercises.length} exercises
        {session.completedAt
          ? ` - ${formatDuration(
              durationSecondsBetween(session.startedAt, session.completedAt),
            )}`
          : ''}
      </Text>
      {session.notes ? (
        <Text style={styles.meta}>{session.notes}</Text>
      ) : null}
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {exercise.order}. {exercise.exerciseName}
          </Text>
          {exercise.sets.map((set) => (
            <Text key={set.id} style={styles.setLine}>
              Set {set.order}: {set.reps ?? '-'} reps x {set.weightKg ?? '-'} kg
            </Text>
          ))}
        </View>
      ))}
      <Link href="/history" style={styles.link}>
        Back to history
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
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
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
  setLine: {
    color: colors.textMuted,
    fontSize: 14,
  },
  link: {
    ...commonStyles.link,
  },
});
