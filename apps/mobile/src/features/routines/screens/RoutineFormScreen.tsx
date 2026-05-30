import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  exercisesClient,
} from '@/features/exercises/api/exercisesClient';
import { CustomExerciseModal } from '@/features/routines/components/CustomExerciseModal';
import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import type {
  Exercise,
  Routine,
  RoutineExercise,
  RoutineExerciseInput,
  RoutineExerciseSet,
} from '@workout/domain';

type RoutineFormScreenProps = {
  mode: 'create' | 'edit';
  routineId?: string;
};

type EditableRoutineSet = {
  id: string;
  minReps: string;
  maxReps: string;
  targetWeight: string;
};

type EditableRoutineExercise = {
  id: string;
  exerciseId?: string;
  exerciseQuery: string;
  sets: EditableRoutineSet[];
};

type ActiveCustomExerciseDraft = {
  exerciseRowId: string;
  initialName: string;
};

function createRowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptySetRow(): EditableRoutineSet {
  return {
    id: createRowId('routine-set-row'),
    minReps: '',
    maxReps: '',
    targetWeight: '',
  };
}

function createEmptyExerciseRow(): EditableRoutineExercise {
  return {
    id: createRowId('routine-exercise-row'),
    exerciseId: undefined,
    exerciseQuery: '',
    sets: [createEmptySetRow()],
  };
}

function toEditableSet(routineSet: RoutineExerciseSet): EditableRoutineSet {
  return {
    id: routineSet.id,
    minReps: routineSet.minReps !== undefined ? String(routineSet.minReps) : '',
    maxReps: routineSet.maxReps !== undefined ? String(routineSet.maxReps) : '',
    targetWeight:
      routineSet.targetWeight !== undefined ? String(routineSet.targetWeight) : '',
  };
}

function toEditableExercise(
  routineExercise: RoutineExercise,
): EditableRoutineExercise {
  return {
    id: routineExercise.id,
    exerciseId: routineExercise.exerciseId,
    exerciseQuery: routineExercise.exerciseName,
    sets:
      routineExercise.sets.length > 0
        ? routineExercise.sets
            .slice()
            .sort((left, right) => left.setNumber - right.setNumber)
            .map(toEditableSet)
        : [createEmptySetRow()],
  };
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toSortedExercises(exercises: Exercise[]) {
  return exercises
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
}

function upsertExercise(currentExercises: Exercise[], nextExercise: Exercise) {
  const existingIndex = currentExercises.findIndex(
    (exercise) => exercise.id === nextExercise.id,
  );

  if (existingIndex === -1) {
    return toSortedExercises([...currentExercises, nextExercise]);
  }

  const updatedExercises = currentExercises.slice();
  updatedExercises[existingIndex] = nextExercise;

  return toSortedExercises(updatedExercises);
}

export function RoutineFormScreen({
  mode,
  routineId,
}: RoutineFormScreenProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<EditableRoutineExercise[]>([
    createEmptyExerciseRow(),
  ]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isExercisesLoading, setIsExercisesLoading] = useState(true);
  const [exerciseLoadError, setExerciseLoadError] = useState<string>();
  const [activeExerciseSelectorRowId, setActiveExerciseSelectorRowId] = useState<
    string | null
  >(null);
  const [activeCustomExerciseDraft, setActiveCustomExerciseDraft] =
    useState<ActiveCustomExerciseDraft | null>(null);
  const activeWorkout = useActiveWorkout();

  useEffect(() => {
    let isMounted = true;

    async function loadExercises() {
      try {
        setIsExercisesLoading(true);
        setExerciseLoadError(undefined);
        const nextExercises = await exercisesClient.list();

        if (isMounted) {
          setAvailableExercises(toSortedExercises(nextExercises));
        }
      } catch (error) {
        if (isMounted) {
          setExerciseLoadError(
            error instanceof Error ? error.message : 'Unable to load exercises.',
          );
        }
      } finally {
        if (isMounted) {
          setIsExercisesLoading(false);
        }
      }
    }

    void loadExercises();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRoutine() {
      if (!isEditMode) {
        setIsLoading(false);
        return;
      }

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
          setName(nextRoutine.name);
          setDescription(nextRoutine.description ?? '');
          setExercises(
            nextRoutine.exercises.length > 0
              ? nextRoutine.exercises
                  .slice()
                  .sort((left, right) => left.orderIndex - right.orderIndex)
                  .map(toEditableExercise)
              : [createEmptyExerciseRow()],
          );
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
  }, [isEditMode, routineId]);

  function updateExerciseQuery(exerciseId: string, value: string) {
    setActiveExerciseSelectorRowId(value.trim() ? exerciseId : null);
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              exerciseId: undefined,
              exerciseQuery: value,
            }
          : exercise,
      ),
    );
  }

  function selectExercise(exerciseRowId: string, selectedExercise: Exercise) {
    setActiveExerciseSelectorRowId(null);
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseRowId
          ? {
              ...exercise,
              exerciseId: selectedExercise.id,
              exerciseQuery: selectedExercise.name,
            }
          : exercise,
      ),
    );
  }

  function openCustomExerciseModal(exerciseRowId: string) {
    const exerciseRow = exercises.find((exercise) => exercise.id === exerciseRowId);
    const exerciseName = exerciseRow?.exerciseQuery.trim();

    if (!exerciseName) {
      setErrorMessage('Enter an exercise name before creating a custom exercise.');
      return;
    }

    Keyboard.dismiss();
    setActiveCustomExerciseDraft({
      exerciseRowId,
      initialName: exerciseName,
    });
    setActiveExerciseSelectorRowId(null);
    setErrorMessage(undefined);
  }

  function handleCustomExerciseCreated(createdExercise: Exercise) {
    if (!activeCustomExerciseDraft) {
      return;
    }

    setAvailableExercises((currentExercises) =>
      upsertExercise(currentExercises, createdExercise),
    );
    selectExercise(activeCustomExerciseDraft.exerciseRowId, createdExercise);
    setActiveCustomExerciseDraft(null);
  }

  function updateSetField(
    exerciseId: string,
    setId: string,
    field: keyof EditableRoutineSet,
    value: string,
  ) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function addExerciseRow() {
    setExercises((currentExercises) => [
      ...currentExercises,
      createEmptyExerciseRow(),
    ]);
  }

  function removeExerciseRow(exerciseId: string) {
    setExercises((currentExercises) => {
      const nextExercises = currentExercises.filter(
        (exercise) => exercise.id !== exerciseId,
      );

      return nextExercises.length > 0 ? nextExercises : [createEmptyExerciseRow()];
    });
  }

  function addSetRow(exerciseId: string) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: [...exercise.sets, createEmptySetRow()] }
          : exercise,
      ),
    );
  }

  function removeSetRow(exerciseId: string, setId: string) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const nextSets = exercise.sets.filter((set) => set.id !== setId);

        return {
          ...exercise,
          sets: nextSets.length > 0 ? nextSets : [createEmptySetRow()],
        };
      }),
    );
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setErrorMessage('Routine name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(undefined);

      const routineExercises: RoutineExerciseInput[] = [];

      for (const [exerciseIndex, exercise] of exercises.entries()) {
        if (!exercise.exerciseId) {
          setErrorMessage('Select an exercise for each routine exercise.');
          return;
        }

        const sets: RoutineExerciseInput['sets'] = [];

        for (const [setIndex, set] of exercise.sets.entries()) {
          const minReps = parseOptionalInteger(set.minReps);
          const maxReps = parseOptionalInteger(set.maxReps);
          const targetWeight = parseOptionalNumber(set.targetWeight);

          if (
            minReps === null ||
            maxReps === null ||
            targetWeight === null
          ) {
            setErrorMessage('Routine set values must be valid numbers.');
            return;
          }

          sets.push({
            setNumber: setIndex + 1,
            minReps,
            maxReps,
            targetWeight,
          });
        }

        routineExercises.push({
          exerciseId: exercise.exerciseId,
          orderIndex: exerciseIndex + 1,
          sets,
        });
      }

      if (isEditMode) {
        if (!routineId || !routine) {
          setErrorMessage('Routine not available for editing.');
          return;
        }

        const updatedRoutine = await routinesClient.update(routineId, {
          name: trimmedName,
          description: trimmedDescription || undefined,
          exercises: routineExercises,
        });

        setRoutine(updatedRoutine);
        setExercises(
          updatedRoutine.exercises
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map(toEditableExercise),
        );
        router.replace(`/routines/${updatedRoutine.id}`);
        return;
      }

      const createdRoutine = await routinesClient.create({
        name: trimmedName,
        description: trimmedDescription || undefined,
        exercises: routineExercises,
      });

      router.replace(`/routines/${createdRoutine.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save routine.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditMode && activeWorkout?.routineId === routineId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Edit Routine</Text>
        <Text style={styles.body}>
          This routine has a workout in progress. Finish or discard it before
          editing.
        </Text>
        <Link href={`/routines/${routineId}`} style={styles.link}>
          Back to routine
        </Link>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Routine' : 'Create Routine'}
        </Text>
        <Text style={styles.body}>Loading routine...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>
          {isEditMode ? 'Edit Routine' : 'Create Routine'}
        </Text>
        <Text style={styles.body}>
          {isEditMode
            ? 'This form updates backend routines with nested exercise sets.'
            : 'This form creates backend routines with nested exercise sets.'}
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Routine name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter routine name"
            style={styles.input}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a short description"
            multiline
            style={[styles.input, styles.multilineInput]}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Routine exercises</Text>
          <Text style={styles.meta}>
            Add exercises, then add the target sets for each exercise.
          </Text>
          {isExercisesLoading ? (
            <Text style={styles.meta}>Loading exercises...</Text>
          ) : null}
          {exerciseLoadError ? (
            <View style={styles.inlineState}>
              <Text style={styles.error}>{exerciseLoadError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsExercisesLoading(true);
                  setExerciseLoadError(undefined);
                  void exercisesClient
                    .list()
                    .then((nextExercises) => {
                      setAvailableExercises(toSortedExercises(nextExercises));
                    })
                    .catch((error: unknown) => {
                      setExerciseLoadError(
                        error instanceof Error
                          ? error.message
                          : 'Unable to load exercises.',
                      );
                    })
                    .finally(() => {
                      setIsExercisesLoading(false);
                    });
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Retry exercises</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.exerciseList}>
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseCardTitle}>Exercise {index + 1}</Text>
                <TextInput
                  value={exercise.exerciseQuery}
                  onChangeText={(value) => updateExerciseQuery(exercise.id, value)}
                  onFocus={() => {
                    if (exercise.exerciseQuery.trim()) {
                      setActiveExerciseSelectorRowId(exercise.id);
                    }
                  }}
                  placeholder="Search exercise"
                  style={styles.input}
                />
                {exercise.exerciseId ? (
                  <Text style={styles.meta}>Selected exercise saved by ID.</Text>
                ) : null}
                {activeExerciseSelectorRowId === exercise.id &&
                exercise.exerciseQuery.trim() ? (
                  (() => {
                    const normalizedQuery = exercise.exerciseQuery.trim().toLowerCase();
                    const matchingExercises = availableExercises
                      .filter((candidate) =>
                        candidate.name.toLowerCase().includes(normalizedQuery),
                      )
                      .slice(0, 5);

                    return (
                      <View style={styles.searchResults}>
                        {matchingExercises.map((candidate) => (
                          <Pressable
                            key={candidate.id}
                            accessibilityRole="button"
                            onPress={() => selectExercise(exercise.id, candidate)}
                            style={({ pressed }) => [
                              styles.searchResultButton,
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.searchResultTitle}>{candidate.name}</Text>
                            <Text style={styles.meta}>
                              {candidate.isSystemDefined
                                ? 'Existing exercise'
                                : 'Custom exercise'}
                            </Text>
                          </Pressable>
                        ))}
                        {!isExercisesLoading &&
                        !exerciseLoadError &&
                        matchingExercises.length === 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => openCustomExerciseModal(exercise.id)}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text style={styles.secondaryButtonText}>
                              Create custom exercise
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })()
                ) : null}
                <View style={styles.setList}>
                  {exercise.sets.map((set, setIndex) => (
                    <View key={set.id} style={styles.setCard}>
                      <Text style={styles.setCardTitle}>Set {setIndex + 1}</Text>
                      <View style={styles.numericRow}>
                        <TextInput
                          value={set.minReps}
                          onChangeText={(value) =>
                            updateSetField(exercise.id, set.id, 'minReps', value)
                          }
                          placeholder="Min reps"
                          keyboardType="number-pad"
                          style={[styles.input, styles.numericInput]}
                        />
                        <TextInput
                          value={set.maxReps}
                          onChangeText={(value) =>
                            updateSetField(exercise.id, set.id, 'maxReps', value)
                          }
                          placeholder="Max reps"
                          keyboardType="number-pad"
                          style={[styles.input, styles.numericInput]}
                        />
                        <TextInput
                          value={set.targetWeight}
                          onChangeText={(value) =>
                            updateSetField(
                              exercise.id,
                              set.id,
                              'targetWeight',
                              value,
                            )
                          }
                          placeholder="Kg"
                          keyboardType="decimal-pad"
                          style={[styles.input, styles.numericInput]}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => removeSetRow(exercise.id, set.id)}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          pressed ? styles.buttonPressed : null,
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>Remove set</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addSetRow(exercise.id)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Add set</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => removeExerciseRow(exercise.id)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Remove exercise</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={addExerciseRow}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Add exercise</Text>
          </Pressable>
        </View>
        {isEditMode ? (
          routine ? (
            <Text style={styles.meta}>
              Current routine summary: {getRoutineExerciseSummary(routine, 3)}
            </Text>
          ) : (
            <Text style={styles.meta}>Routine not found in the API response.</Text>
          )
        ) : null}
        {isSubmitting ? <Text style={styles.meta}>Saving routine...</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.buttonText}>
            {isSubmitting
              ? 'Saving...'
              : isEditMode
                ? 'Save routine'
                : 'Create routine'}
          </Text>
        </Pressable>
        <View style={styles.links}>
          <Link href="/routines" style={styles.link}>
            Back to routines
          </Link>
          {isEditMode && routine ? (
            <Link href={`/routines/${routine.id}`} style={styles.link}>
              Open detail
            </Link>
          ) : null}
        </View>
      </ScrollView>
      {activeCustomExerciseDraft ? (
        <CustomExerciseModal
          visible
          initialName={activeCustomExerciseDraft.initialName}
          onClose={() => setActiveCustomExerciseDraft(null)}
          onCreated={handleCustomExerciseCreated}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 64,
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
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
  },
  exerciseCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setList: {
    gap: 8,
  },
  inlineState: {
    gap: 8,
  },
  searchResults: {
    gap: 8,
  },
  searchResultButton: {
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  setCard: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  setCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  numericRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numericInput: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
