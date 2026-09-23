import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  effectiveRoutineSetValue,
  setFieldPlaceholder,
} from '@/features/routines/utils/routineSetInheritance';
import { useSettings } from '@/features/settings/SettingsContext';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { kgToInputString, roundWeight, toKg } from '@/lib/weight';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type {
  Exercise,
  Routine,
  RoutineExercise,
  RoutineExerciseInput,
  RoutineExerciseSet,
  WeightUnit,
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
  restSeconds: string;
  supersetGroup: string;
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
    restSeconds: '',
    supersetGroup: '',
    sets: [createEmptySetRow()],
  };
}

function toEditableSet(
  routineSet: RoutineExerciseSet,
  unit: WeightUnit,
): EditableRoutineSet {
  return {
    id: routineSet.id,
    minReps: routineSet.minReps !== undefined ? String(routineSet.minReps) : '',
    maxReps: routineSet.maxReps !== undefined ? String(routineSet.maxReps) : '',
    targetWeight:
      routineSet.targetWeight !== undefined
        ? kgToInputString(routineSet.targetWeight, unit)
        : '',
  };
}

function toEditableExercise(
  routineExercise: RoutineExercise,
  unit: WeightUnit,
): EditableRoutineExercise {
  return {
    id: routineExercise.id,
    exerciseId: routineExercise.exerciseId,
    exerciseQuery: routineExercise.exerciseName,
    restSeconds:
      routineExercise.restSeconds !== undefined
        ? String(routineExercise.restSeconds)
        : '',
    supersetGroup:
      routineExercise.supersetGroup !== undefined
        ? String(routineExercise.supersetGroup)
        : '',
    sets:
      routineExercise.sets.length > 0
        ? routineExercise.sets
            .slice()
            .sort((left, right) => left.setNumber - right.setNumber)
            .map((set) => toEditableSet(set, unit))
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
  const { t } = useTranslation();
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const { settings } = useSettings();
  const unit = settings.unit;
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState('');
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
            error instanceof Error ? error.message : t('routineForm.loadExercisesError'),
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
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    async function loadRoutine() {
      if (!isEditMode) {
        setIsLoading(false);
        return;
      }

      if (!routineId) {
        setErrorMessage(t('routineDetail.missingId'));
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
          setFolder(nextRoutine.folder ?? '');
          setExercises(
            nextRoutine.exercises.length > 0
              ? nextRoutine.exercises
                  .slice()
                  .sort((left, right) => left.orderIndex - right.orderIndex)
                  .map((exercise) => toEditableExercise(exercise, unit))
              : [createEmptyExerciseRow()],
          );
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : t('routineDetail.loadError'),
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
  }, [isEditMode, routineId, t]);

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
      setErrorMessage(t('routineForm.enterExerciseName'));
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

  function updateExerciseRest(exerciseId: string, value: string) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, restSeconds: value }
          : exercise,
      ),
    );
  }

  function updateExerciseSuperset(exerciseId: string, value: string) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, supersetGroup: value }
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

  function moveExerciseRow(index: number, direction: 'up' | 'down') {
    setExercises((currentExercises) => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= currentExercises.length) {
        return currentExercises;
      }
      const next = currentExercises.slice();
      const moved = next[index]!;
      next[index] = next[target]!;
      next[target] = moved;
      return next;
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
      setErrorMessage(t('routineForm.nameRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(undefined);

      const routineExercises: RoutineExerciseInput[] = [];

      for (const [exerciseIndex, exercise] of exercises.entries()) {
        if (!exercise.exerciseId) {
          setErrorMessage(t('routineForm.selectExercise'));
          return;
        }

        const restSeconds = parseOptionalInteger(exercise.restSeconds);

        if (restSeconds === null) {
          setErrorMessage(t('routineForm.restWholeNumber'));
          return;
        }

        const supersetGroup = parseOptionalInteger(exercise.supersetGroup);

        if (supersetGroup === null) {
          setErrorMessage(t('routineForm.supersetWholeNumber'));
          return;
        }

        const sets: RoutineExerciseInput['sets'] = [];

        for (const [setIndex] of exercise.sets.entries()) {
          // Unedited fields inherit the previous set's value (the ghosted placeholder).
          const minReps = parseOptionalInteger(
            effectiveRoutineSetValue(exercise.sets, setIndex, 'minReps'),
          );
          const maxReps = parseOptionalInteger(
            effectiveRoutineSetValue(exercise.sets, setIndex, 'maxReps'),
          );
          const targetWeight = parseOptionalNumber(
            effectiveRoutineSetValue(exercise.sets, setIndex, 'targetWeight'),
          );

          if (
            minReps === null ||
            maxReps === null ||
            targetWeight === null
          ) {
            setErrorMessage(t('routineForm.setValuesInvalid'));
            return;
          }

          sets.push({
            setNumber: setIndex + 1,
            minReps,
            maxReps,
            // Stored canonically in kg; the input is in the user's unit.
            targetWeight:
              targetWeight !== undefined
                ? roundWeight(toKg(targetWeight, unit))
                : undefined,
          });
        }

        routineExercises.push({
          exerciseId: exercise.exerciseId,
          orderIndex: exerciseIndex + 1,
          restSeconds,
          supersetGroup,
          sets,
        });
      }

      if (isEditMode) {
        if (!routineId || !routine) {
          setErrorMessage(t('routineForm.notAvailableEdit'));
          return;
        }

        const updatedRoutine = await routinesClient.update(routineId, {
          name: trimmedName,
          description: trimmedDescription || undefined,
          folder: folder.trim() || undefined,
          exercises: routineExercises,
        });

        setRoutine(updatedRoutine);
        setExercises(
          updatedRoutine.exercises
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map((exercise) => toEditableExercise(exercise, unit)),
        );
        router.replace(`/routines/${updatedRoutine.id}`);
        return;
      }

      const createdRoutine = await routinesClient.create({
        name: trimmedName,
        description: trimmedDescription || undefined,
        folder: folder.trim() || undefined,
        exercises: routineExercises,
      });

      router.replace(`/routines/${createdRoutine.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('routineForm.saveError'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditMode && activeWorkout?.routineId === routineId) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{t('routineForm.workoutInProgress')}</Text>
        <Link href={`/routines/${routineId}`} style={styles.link}>
          {t('routineForm.backToRoutine')}
        </Link>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{t('routineDetail.loading')}</Text>
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
        <Text style={styles.body}>
          {isEditMode
            ? t('routineForm.editIntro')
            : t('routineForm.createIntro')}
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('routineForm.routineName')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('routineForm.routineNamePlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('routineForm.description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('routineForm.descriptionPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[styles.input, styles.multilineInput]}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('routineForm.folder')}</Text>
          <TextInput
            value={folder}
            onChangeText={setFolder}
            placeholder={t('routineForm.folderPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('routineForm.routineExercises')}</Text>
          <Text style={styles.meta}>{t('routineForm.exercisesHint')}</Text>
          {isExercisesLoading ? (
            <Text style={styles.meta}>{t('routineForm.loadingExercises')}</Text>
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
                          : t('routineForm.loadExercisesError'),
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
                <Text style={styles.secondaryButtonText}>
                  {t('routineForm.retryExercises')}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.exerciseList}>
            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseCardTitle}>
                    {t('routineForm.exerciseN', { number: index + 1 })}
                  </Text>
                  <View style={styles.exerciseReorder}>
                    <Pressable
                      onPress={() => moveExerciseRow(index, 'up')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderArrow}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moveExerciseRow(index, 'down')}
                      hitSlop={8}
                    >
                      <Text style={styles.reorderArrow}>↓</Text>
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  value={exercise.exerciseQuery}
                  onChangeText={(value) => updateExerciseQuery(exercise.id, value)}
                  onFocus={() => {
                    if (exercise.exerciseQuery.trim()) {
                      setActiveExerciseSelectorRowId(exercise.id);
                    }
                  }}
                  placeholder={t('routineForm.searchExercise')}
                  placeholderTextColor={colors.textSubtle}
                  style={styles.input}
                />
                {exercise.exerciseId ? (
                  <Text style={styles.selectedHint}>
                    {t('routineForm.exerciseSelected')}
                  </Text>
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
                                ? t('routineForm.existingExercise')
                                : t('routineForm.customExercise')}
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
                              {t('routineForm.createCustomExercise')}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })()
                ) : null}
                <View style={styles.metaInputsRow}>
                  <View style={styles.restRow}>
                    <Text style={styles.meta}>{t('routineForm.restBetweenSets')}</Text>
                    <TextInput
                      value={exercise.restSeconds}
                      onChangeText={(value) =>
                        updateExerciseRest(exercise.id, value)
                      }
                      placeholder={t('routineForm.restPlaceholder')}
                      placeholderTextColor={colors.textSubtle}
                      keyboardType="number-pad"
                      style={[styles.input, styles.restInput]}
                    />
                  </View>
                  <View style={styles.restRow}>
                    <Text style={styles.meta}>{t('routineForm.supersetGroup')}</Text>
                    <TextInput
                      value={exercise.supersetGroup}
                      onChangeText={(value) =>
                        updateExerciseSuperset(exercise.id, value)
                      }
                      placeholder={t('routineForm.supersetPlaceholder')}
                      placeholderTextColor={colors.textSubtle}
                      keyboardType="number-pad"
                      style={[styles.input, styles.restInput]}
                    />
                  </View>
                </View>
                <View style={styles.setList}>
                  {exercise.sets.map((set, setIndex) => (
                    <View key={set.id} style={styles.setCard}>
                      <Text style={styles.setCardTitle}>
                        {t('routineForm.setN', { number: setIndex + 1 })}
                      </Text>
                      <View style={styles.numericRow}>
                        <Text style={styles.numericLabel}>{t('routineForm.minReps')}</Text>
                        <Text style={styles.numericLabel}>{t('routineForm.maxReps')}</Text>
                        <Text style={styles.numericLabel}>
                          {t('routineForm.weightUnit', { unit })}
                        </Text>
                      </View>
                      <View style={styles.numericRow}>
                        <TextInput
                          value={set.minReps}
                          onChangeText={(value) =>
                            updateSetField(exercise.id, set.id, 'minReps', value)
                          }
                          placeholder={setFieldPlaceholder(
                            exercise.sets,
                            setIndex,
                            'minReps',
                          )}
                          placeholderTextColor={colors.textSubtle}
                          keyboardType="number-pad"
                          style={[styles.input, styles.numericInput]}
                        />
                        <TextInput
                          value={set.maxReps}
                          onChangeText={(value) =>
                            updateSetField(exercise.id, set.id, 'maxReps', value)
                          }
                          placeholder={setFieldPlaceholder(
                            exercise.sets,
                            setIndex,
                            'maxReps',
                          )}
                          placeholderTextColor={colors.textSubtle}
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
                          placeholder={setFieldPlaceholder(
                            exercise.sets,
                            setIndex,
                            'targetWeight',
                          )}
                          placeholderTextColor={colors.textSubtle}
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
                        <Text style={styles.secondaryButtonText}>
                          {t('routineForm.removeSet')}
                        </Text>
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
                    <Text style={styles.secondaryButtonText}>
                      {t('routineForm.addSet')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => removeExerciseRow(exercise.id)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {t('routineForm.removeExercise')}
                    </Text>
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
            <Text style={styles.secondaryButtonText}>
              {t('routineForm.addExercise')}
            </Text>
          </Pressable>
        </View>
        {isEditMode ? (
          routine ? (
            <Text style={styles.meta}>
              {t('routineForm.currentSummary', {
                summary: getRoutineExerciseSummary(routine, 3),
              })}
            </Text>
          ) : (
            <Text style={styles.meta}>{t('routineDetail.notFoundResponse')}</Text>
          )
        ) : null}
        {isSubmitting ? (
          <Text style={styles.meta}>{t('routineForm.savingRoutine')}</Text>
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
              ? t('routineForm.saving')
              : isEditMode
                ? t('routineForm.saveRoutine')
                : t('routines.createRoutine')}
          </Text>
        </Pressable>
        <View style={styles.links}>
          <Link href="/routines" style={styles.link}>
            {t('routineDetail.backToRoutines')}
          </Link>
          {isEditMode && routine ? (
            <Link href={`/routines/${routine.id}`} style={styles.link}>
              {t('routineForm.openDetail')}
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
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.fixedContent,
  },
  contentContainer: {
    ...commonStyles.scrollContent,
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    ...commonStyles.body,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    ...commonStyles.label,
  },
  input: {
    ...commonStyles.input,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseCard: {
    ...commonStyles.card,
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseReorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  reorderArrow: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  exerciseCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  metaInputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  restRow: {
    flex: 1,
    gap: spacing.xs,
  },
  restInput: {
    alignSelf: 'stretch',
  },
  setList: {
    gap: spacing.sm,
  },
  inlineState: {
    gap: spacing.sm,
  },
  searchResults: {
    gap: spacing.sm,
  },
  searchResultButton: {
    backgroundColor: colors.surfaceRaised,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchResultTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  setCard: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  setCardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  numericRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numericInput: {
    flex: 1,
  },
  numericLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meta: {
    ...commonStyles.meta,
  },
  selectedHint: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    ...commonStyles.error,
  },
  button: {
    ...commonStyles.primaryButton,
  },
  buttonText: {
    ...commonStyles.primaryButtonText,
  },
  buttonPressed: {
    ...commonStyles.pressed,
  },
  buttonDisabled: {
    ...commonStyles.disabled,
  },
  secondaryButton: {
    ...commonStyles.secondaryButton,
  },
  secondaryButtonText: {
    ...commonStyles.secondaryButtonText,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  link: {
    ...commonStyles.link,
  },
});
