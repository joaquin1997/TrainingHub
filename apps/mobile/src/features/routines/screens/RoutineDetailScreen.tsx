import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { buildRoutineCopyInput } from '@/features/routines/utils/duplicateRoutine';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { formatWeight } from '@/lib/weight';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { RoutineExerciseSet, Routine, WeightUnit } from '@workout/domain';

function formatSetTarget(set: RoutineExerciseSet, unit: WeightUnit) {
  const reps =
    set.minReps !== undefined && set.maxReps !== undefined
      ? `${set.minReps}-${set.maxReps} reps`
      : set.minReps !== undefined
        ? `${set.minReps}+ reps`
        : set.maxReps !== undefined
          ? `up to ${set.maxReps} reps`
          : '- reps';
  const weight =
    set.targetWeight !== undefined
      ? ` - ${formatWeight(set.targetWeight, unit)}`
      : '';

  return `${reps}${weight}`;
}

export function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const activeWorkout = useActiveWorkout();
  const { settings } = useSettings();

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

  async function handleDuplicate() {
    if (!routine) {
      return;
    }

    try {
      setIsDuplicating(true);
      setErrorMessage(undefined);

      const created = await routinesClient.create(buildRoutineCopyInput(routine));

      router.replace(`/routines/${created.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to duplicate routine.',
      );
    } finally {
      setIsDuplicating(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Loading routine...</Text>
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>{routine.name}</Text>
      {routine.description ? (
        <Text style={styles.description}>{routine.description}</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
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
                {exercise.restSeconds !== undefined ? (
                  <Text style={styles.meta}>Rest: {exercise.restSeconds}s</Text>
                ) : null}
                {exercise.supersetGroup !== undefined ? (
                  <Text style={styles.supersetBadge}>
                    Superset {exercise.supersetGroup}
                  </Text>
                ) : null}
                {exercise.sets.length === 0 ? (
                  <Text style={styles.meta}>No target sets</Text>
                ) : (
                  exercise.sets
                    .slice()
                    .sort((left, right) => left.setNumber - right.setNumber)
                    .map((set) => (
                      <Text key={set.id} style={styles.exerciseItem}>
                        Set {set.setNumber}: {formatSetTarget(set, settings.unit)}
                      </Text>
                    ))
                )}
              </View>
            ))}
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/workouts/active',
              params: {
                routineId:
                  activeWorkout && activeWorkout.routineId !== routine.id
                    ? activeWorkout.routineId
                    : routine.id,
              },
            })
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {activeWorkout && activeWorkout.routineId === routine.id
              ? 'Continue workout'
              : activeWorkout
                ? 'Resume active workout'
                : 'Start workout'}
          </Text>
        </Pressable>
        {activeWorkout && activeWorkout.routineId === routine.id ? (
          <Text style={styles.meta}>
            Editing is locked while this workout is in progress
          </Text>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push(`/routines/edit/${routine.id}`)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleDuplicate()}
              disabled={isDuplicating}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {isDuplicating ? 'Duplicating...' : 'Duplicate'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void handleDelete()}
        disabled={isDeleting}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed ? styles.buttonPressed : null,
              isDeleting ? styles.buttonDisabled : null,
            ]}
      >
        <Text style={styles.deleteButtonText}>
          {isDeleting ? 'Deleting...' : 'Delete routine'}
        </Text>
      </Pressable>
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
  description: {
    ...commonStyles.body,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseCard: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  exerciseTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  supersetBadge: {
    alignSelf: 'flex-start',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  link: {
    ...commonStyles.link,
  },
  actions: {
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    ...commonStyles.primaryButton,
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    ...commonStyles.primaryButtonText,
  },
  deleteButton: {
    ...commonStyles.secondaryButton,
    alignSelf: 'stretch',
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  secondaryButton: {
    ...commonStyles.secondaryButton,
    flex: 1,
  },
  secondaryButtonText: {
    ...commonStyles.secondaryButtonText,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    ...commonStyles.disabled,
  },
  buttonPressed: {
    ...commonStyles.pressed,
  },
});
