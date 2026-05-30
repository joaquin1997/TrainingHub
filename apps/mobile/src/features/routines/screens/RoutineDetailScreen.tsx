import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import type { RoutineExerciseSet, Routine } from '@workout/domain';

function formatSetTarget(set: RoutineExerciseSet) {
  const reps =
    set.minReps !== undefined && set.maxReps !== undefined
      ? `${set.minReps}-${set.maxReps} reps`
      : set.minReps !== undefined
        ? `${set.minReps}+ reps`
        : set.maxReps !== undefined
          ? `up to ${set.maxReps} reps`
          : '— reps';
  const weight = set.targetWeight !== undefined ? ` · ${set.targetWeight} kg` : '';

  return `${reps}${weight}`;
}

export function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const activeWorkout = useActiveWorkout();

  const loadRoutine = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setRoutine(null);
      }

      if (!routineId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing routine id.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextRoutine = await routinesClient.getById(routineId);

        if (shouldUpdate()) {
          if (!nextRoutine) {
            setErrorMessage('Routine not found.');
            return;
          }

          setRoutine(nextRoutine);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load routine.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [routineId],
  );

  useEffect(() => {
    let isActive = true;

    void loadRoutine(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadRoutine]);

  async function handleDelete() {
    if (!routineId) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(undefined);
      await routinesClient.remove(routineId);
      router.replace('/routines');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete routine.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Routine Detail</Text>
        <Text style={styles.body}>Loading routine...</Text>
        <RouteLinks currentRoute="routine-detail" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Routine Detail</Text>
        <Text style={styles.body}>Routine unavailable</Text>
        <Text style={styles.error}>
          {errorMessage ?? 'Routine not found in the API response.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadRoutine()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
        <RouteLinks currentRoute="routine-detail" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Routine Detail</Text>
      <Text style={styles.body}>{routine.name}</Text>
      {routine.description ? (
        <Text style={styles.description}>{routine.description}</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Text style={styles.meta}>Routine ID: {routine.id}</Text>
      <Text style={styles.meta}>
        Exercise summary: {getRoutineExerciseSummary(routine, 3)}
      </Text>
      {routine.exercises.length === 0 ? (
        <Text style={styles.meta}>No exercises in this routine yet.</Text>
      ) : (
        <View style={styles.exerciseList}>
          {routine.exercises
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseTitle}>
                  {exercise.orderIndex}. {exercise.exerciseName}
                </Text>
                {exercise.sets.length === 0 ? (
                  <Text style={styles.meta}>No target sets</Text>
                ) : (
                  exercise.sets
                    .slice()
                    .sort((left, right) => left.setNumber - right.setNumber)
                    .map((set) => (
                      <Text key={set.id} style={styles.exerciseItem}>
                        Set {set.setNumber}: {formatSetTarget(set)}
                      </Text>
                    ))
                )}
              </View>
            ))}
        </View>
      )}
      <View style={styles.links}>
        {activeWorkout && activeWorkout.routineId === routine.id ? (
          <Link
            href={{
              pathname: '/workouts/active',
              params: { routineId: routine.id },
            }}
            style={styles.link}
          >
            Continue workout
          </Link>
        ) : activeWorkout ? (
          <Link
            href={{
              pathname: '/workouts/active',
              params: { routineId: activeWorkout.routineId },
            }}
            style={styles.link}
          >
            Resume active workout
          </Link>
        ) : (
          <Link
            href={{
              pathname: '/workouts/active',
              params: { routineId: routine.id },
            }}
            style={styles.link}
          >
            Start workout
          </Link>
        )}
        <Link href={`/routines/edit/${routine.id}`} style={styles.link}>
          Edit routine
        </Link>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void handleDelete()}
        disabled={isDeleting}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed ? styles.deleteButtonPressed : null,
          isDeleting ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.deleteButtonText}>
          {isDeleting ? 'Deleting...' : 'Delete routine'}
        </Text>
      </Pressable>
      <RouteLinks currentRoute="routine-detail" />
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
    fontSize: 24,
    fontWeight: '600',
  },
  description: {
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
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
