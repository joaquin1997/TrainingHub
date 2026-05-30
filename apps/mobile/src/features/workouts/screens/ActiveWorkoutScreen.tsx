import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import {
  notifyAppleWorkoutFinished,
  notifyAppleWorkoutStarted,
  syncWorkoutCompletionToAppleHealth,
} from '@/features/health/integrations/appleWorkoutIntegration';
import {
  addSetToWorkoutExercise,
  clearActiveWorkout,
  countWorkoutSets,
  moveWorkoutExercise,
  moveWorkoutSet,
  removeSetFromWorkoutExercise,
  saveCompletedWorkout,
  setActiveWorkout,
  startActiveWorkout,
  toCreateWorkoutSessionInput,
  toggleWorkoutSetDone,
  toWorkoutSessionSkeleton,
  updateWorkoutSetDraft,
  type WorkoutSessionDraft,
} from '@/features/workouts/state/workoutDraftStore';

export function ActiveWorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutSessionDraft | null>(
    null,
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  useEffect(() => {
    if (!routineId) {
      setStatus('error');
      setErrorMessage(null);
      return;
    }

    let active = true;
    setStatus('loading');

    routinesClient
      .getById(routineId)
      .then((routine) => {
        if (!active) {
          return;
        }

        setWorkoutDraft(startActiveWorkout(routine));
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load routine',
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [routineId]);

  useEffect(() => {
    if (workoutDraft) {
      void notifyAppleWorkoutStarted(workoutDraft);
    }
  }, [workoutDraft]);

  const elapsedSeconds = useElapsedSeconds(workoutDraft?.startedAt);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Workout</Text>
        <ActivityIndicator />
        <Text style={styles.meta}>Loading routine…</Text>
      </View>
    );
  }

  if (status === 'error' || !workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Workout</Text>
        <Text style={styles.meta}>
          {errorMessage ??
            'Start this flow from a routine so the workout session can be created from a routine template.'}
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
        <RouteLinks currentRoute="active-workout" />
      </View>
    );
  }

  const finishWorkout = async () => {
    try {
      setIsFinishing(true);
      setFinishError(null);

      await workoutsClient.create(toCreateWorkoutSessionInput(workoutDraft));

      const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

      saveCompletedWorkout(workoutDraft);
      clearActiveWorkout();

      void notifyAppleWorkoutFinished(
        workoutDraft,
        workoutSession.completedAt ?? workoutSession.updatedAt,
      );
      void syncWorkoutCompletionToAppleHealth(workoutSession);
      router.push('/workouts/summary');
    } catch (error) {
      setFinishError(
        error instanceof Error ? error.message : 'Could not save the workout.',
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSetChange = (
    workoutExerciseId: string,
    workoutSetId: string,
    field: 'reps' | 'weightKg',
    value: string,
  ) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = updateWorkoutSetDraft(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
      field,
      value,
    );

    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleToggleDone = (workoutExerciseId: string, workoutSetId: string) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = toggleWorkoutSetDone(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
    );

    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const applyDraft = (nextDraft: WorkoutSessionDraft) => {
    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleAddSet = (workoutExerciseId: string) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(addSetToWorkoutExercise(workoutDraft, workoutExerciseId));
  };

  const handleMoveExercise = (
    workoutExerciseId: string,
    direction: 'up' | 'down',
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      moveWorkoutExercise(workoutDraft, workoutExerciseId, direction),
    );
  };

  const handleMoveSet = (
    workoutExerciseId: string,
    workoutSetId: string,
    direction: 'up' | 'down',
  ) => {
    if (!workoutDraft) {
      return;
    }

    applyDraft(
      moveWorkoutSet(workoutDraft, workoutExerciseId, workoutSetId, direction),
    );
  };

  const handleRemoveSet = (
    workoutExerciseId: string,
    workoutSetId: string,
  ) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = removeSetFromWorkoutExercise(
      workoutDraft,
      workoutExerciseId,
      workoutSetId,
    );
    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleNotesChange = (value: string) => {
    if (!workoutDraft) {
      return;
    }

    const nextDraft = { ...workoutDraft, notes: value };
    setWorkoutDraft(nextDraft);
    setActiveWorkout(nextDraft);
  };

  const handleDiscard = () => {
    clearActiveWorkout();
    router.replace('/routines');
  };

  const setProgress = countWorkoutSets(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Active Workout</Text>
      <Text style={styles.body}>
        {workoutDraft.routineName}
      </Text>
      <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
      <Text style={styles.meta}>
        {setProgress.done}/{setProgress.total} sets done · logged values are kept
        while in progress, so you can leave and resume this workout.
      </Text>
      <TextInput
        value={workoutDraft.notes ?? ''}
        onChangeText={handleNotesChange}
        placeholder="Workout notes (optional)"
        style={styles.notesInput}
        multiline
      />
      {workoutDraft.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
            <View style={styles.reorderRow}>
              <Pressable
                onPress={() => handleMoveExercise(exercise.id, 'up')}
                hitSlop={8}
              >
                <Text style={styles.reorderText}>↑</Text>
              </Pressable>
              <Pressable
                onPress={() => handleMoveExercise(exercise.id, 'down')}
                hitSlop={8}
              >
                <Text style={styles.reorderText}>↓</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {exercise.imagePlaceholderText ?? 'Image placeholder'}
            </Text>
          </View>
          <Text style={styles.target}>
            Targets: {exercise.entries.length} sets with per-set reps and weight
            goals.
          </Text>
          <View style={styles.setList}>
            {exercise.entries.map((set) => (
              <View key={set.id} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setTitle}>Set {set.order}</Text>
                  <View style={styles.reorderRow}>
                    <Pressable
                      onPress={() => handleMoveSet(exercise.id, set.id, 'up')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderText}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveSet(exercise.id, set.id, 'down')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderText}>↓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveSet(exercise.id, set.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.setTarget}>
                  Target: {set.minReps ?? '?'}-{set.maxReps ?? '?'} reps
                  {set.targetWeight !== undefined ? `, ${set.targetWeight} kg` : ''}
                </Text>
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual reps</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={set.reps}
                      onChangeText={(value) =>
                        handleSetChange(exercise.id, set.id, 'reps', value)
                      }
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual kg</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={set.weightKg}
                      onChangeText={(value) =>
                        handleSetChange(exercise.id, set.id, 'weightKg', value)
                      }
                      style={styles.input}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={() => handleToggleDone(exercise.id, set.id)}
                  style={[
                    styles.doneToggle,
                    set.done ? styles.doneToggleActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.doneToggleText,
                      set.done ? styles.doneToggleTextActive : null,
                    ]}
                  >
                    {set.done ? '✓ Done' : 'Mark done'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => handleAddSet(exercise.id)}
            style={styles.addSetButton}
          >
            <Text style={styles.addSetText}>+ Add set</Text>
          </Pressable>
        </View>
      ))}
      {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
      <Pressable
        onPress={() => void finishWorkout()}
        disabled={isFinishing}
        style={[styles.button, isFinishing ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>
          {isFinishing ? 'Saving workout...' : 'Finish workout'}
        </Text>
      </Pressable>
      <Pressable
        onPress={handleDiscard}
        disabled={isFinishing}
        style={styles.discardButton}
      >
        <Text style={styles.discardButtonText}>Discard workout</Text>
      </Pressable>
      <Text style={styles.todo}>
        TODO: Add timers, backend sync, and live workout persistence when the
        execution flow is expanded.
      </Text>
      <Text style={styles.todo}>
        TODO: Apple Health completion sync and Apple Watch live mirroring hook
        into this screen through isolated Apple-specific integration stubs.
      </Text>
      <RouteLinks currentRoute="active-workout" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  timer: {
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reorderText: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '700',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 84,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#4b5563',
  },
  target: {
    fontSize: 14,
    lineHeight: 22,
  },
  setList: {
    gap: 8,
  },
  setCard: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  removeText: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '600',
  },
  addSetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addSetText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '600',
  },
  setTarget: {
    fontSize: 13,
    color: '#4b5563',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 60,
  },
  doneToggle: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doneToggleActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  doneToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  doneToggleTextActive: {
    color: '#15803d',
  },
  discardButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  discardButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
