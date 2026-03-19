import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  routinesClient,
  type RoutineExerciseWriteInput,
} from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/mocks/mockRoutines';
import type { Routine, RoutineExercise, RoutineExerciseSet } from '@workout/domain';

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
  exerciseName: string;
  sets: EditableRoutineSet[];
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
    exerciseName: '',
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
    exerciseName: routineExercise.exerciseName,
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

  function updateExerciseName(exerciseId: string, value: string) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, exerciseName: value }
          : exercise,
      ),
    );
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

      const routineExercises: RoutineExerciseWriteInput[] = [];

      for (const [exerciseIndex, exercise] of exercises.entries()) {
        const exerciseName = exercise.exerciseName.trim();

        if (!exerciseName) {
          setErrorMessage('Each routine exercise needs a name.');
          return;
        }

        const sets: RoutineExerciseWriteInput['sets'] = [];

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
          exerciseName,
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
        <View style={styles.exerciseList}>
          {exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseCardTitle}>Exercise {index + 1}</Text>
              <TextInput
                value={exercise.exerciseName}
                onChangeText={(value) => updateExerciseName(exercise.id, value)}
                placeholder="Exercise name"
                style={styles.input}
              />
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
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
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
