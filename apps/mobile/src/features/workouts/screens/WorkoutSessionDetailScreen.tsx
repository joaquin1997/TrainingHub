import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { formatDateTime } from '@/lib/format';
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
        <Text style={styles.title}>Workout</Text>
        <Text style={styles.meta}>Loading workout...</Text>
        <RouteLinks currentRoute="workout-history" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Workout</Text>
        <Text style={styles.error}>
          {errorMessage ?? 'Workout not found.'}
        </Text>
        <Link href="/workouts/history" style={styles.link}>
          Back to history
        </Link>
        <RouteLinks currentRoute="workout-history" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Workout</Text>
      <Text style={styles.body}>
        {formatDateTime(session.completedAt ?? session.startedAt)}
      </Text>
      <Text style={styles.meta}>
        {session.status} · {session.exercises.length} exercises
      </Text>
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {exercise.order}. {exercise.exerciseName}
          </Text>
          {exercise.sets.map((set) => (
            <Text key={set.id} style={styles.setLine}>
              Set {set.order}: {set.reps ?? '—'} reps × {set.weightKg ?? '—'} kg
            </Text>
          ))}
        </View>
      ))}
      <Link href="/workouts/history" style={styles.link}>
        Back to history
      </Link>
      <RouteLinks currentRoute="workout-history" />
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
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  setLine: {
    fontSize: 14,
    color: '#374151',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
