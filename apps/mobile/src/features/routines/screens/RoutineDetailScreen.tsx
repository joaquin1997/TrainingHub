import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { routinesClient } from '@/features/routines/api/routinesClient';
import {
  getRoutineExerciseNames,
  getRoutineExerciseSummary,
} from '@/features/routines/mocks/mockRoutines';
import type { Routine } from '@workout/domain';

export function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRoutine() {
      if (!routineId) {
        setErrorMessage('Missing routine id.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(undefined);
        const nextRoutine = await routinesClient.getById(routineId);

        if (isMounted) {
          setRoutine(nextRoutine);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load routine.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRoutine();

    return () => {
      isMounted = false;
    };
  }, [routineId]);

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
        <Text style={styles.body}>
          {errorMessage ?? 'Routine not found in the API response.'}
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
        <RouteLinks currentRoute="routine-detail" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <View style={styles.exerciseList}>
        {getRoutineExerciseNames(routine).map((exerciseName, index) => (
          <Text key={exerciseName} style={styles.exerciseItem}>
            {index + 1}. {exerciseName}
          </Text>
        ))}
      </View>
      <View style={styles.links}>
        <Link
          href={{
            pathname: '/workouts/active',
            params: { routineId: routine.id },
          }}
          style={styles.link}
        >
          Start workout
        </Link>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 8,
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
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
