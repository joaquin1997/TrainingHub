import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import type { Exercise } from '@workout/domain';

export function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadExercise = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setExercise(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing exercise id.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextExercise = await exercisesClient.getById(exerciseId);

        if (shouldUpdate()) {
          setExercise(nextExercise);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load exercise.',
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

    void loadExercise(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadExercise]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercise</Text>
        <Text style={styles.meta}>Loading exercise...</Text>
        <RouteLinks currentRoute="exercises" />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercise</Text>
        <Text style={styles.error}>{errorMessage ?? 'Exercise not found.'}</Text>
        <Link href="/exercises" style={styles.link}>
          Back to exercises
        </Link>
        <RouteLinks currentRoute="exercises" />
      </View>
    );
  }

  const primary = exercise.primaryMuscleGroups ?? [];
  const secondary = exercise.secondaryMuscleGroups ?? [];
  const equipment = exercise.equipment ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>
      {exercise.description ? (
        <Text style={styles.body}>{exercise.description}</Text>
      ) : null}
      <Text style={styles.meta}>
        Primary muscles: {primary.length > 0 ? primary.join(', ') : '—'}
      </Text>
      <Text style={styles.meta}>
        Secondary muscles: {secondary.length > 0 ? secondary.join(', ') : '—'}
      </Text>
      <Text style={styles.meta}>
        Equipment: {equipment.length > 0 ? equipment.join(', ') : '—'}
      </Text>
      <Link href="/exercises" style={styles.link}>
        Back to exercises
      </Link>
      <RouteLinks currentRoute="exercises" />
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
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
