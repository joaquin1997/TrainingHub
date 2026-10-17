import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { CustomExerciseModal } from '@/features/exercises/components/CustomExerciseModal';
import { ExercisePickerModal } from '@/features/exercises/components/ExercisePickerModal';
import {
  RoutineSetTable,
  type EditableRoutineSet,
} from '@/features/routines/components/RoutineSetTable';
import { routinesClient } from '@/features/routines/api/routinesClient';
import { WarmUpBlockEditor } from '@/features/routines/components/WarmUpBlockEditor';
import {
  toEditableWarmUpItems,
  toWarmUpItemsInput,
  type EditableWarmUpItem,
} from '@/features/routines/utils/warmUpItems';
import {
  confirmRoutineApproachSets,
  editRoutineSetValue,
  previewRoutineApproachSets,
  removeRoutineGeneratedWarmUps,
  routineWarmUpActionFor,
  type RoutineApproachSetsNotice,
  type RoutineApproachSetsPreview,
} from '@/features/routines/utils/routineApproachSets';
import { replaceRoutineRowExercise } from '@/features/routines/utils/replaceRoutineExercise';
import {
  effectiveRoutineSetValue,
  type NumericSetField,
} from '@/features/routines/utils/routineSetInheritance';
import { useSettings } from '@/features/settings/SettingsContext';
import { ApproachSetsPreviewSheet } from '@/features/workouts/components/ApproachSetsPreviewSheet';
import { WarmUpActionButton } from '@/features/workouts/components/WarmUpActionButton';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { formatDuration } from '@/lib/format';
import { parseDistanceInput, parseDurationInput, tracksField } from '@/lib/tracking';
import { kgToInputString, roundWeight, toKg } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type {
  Exercise,
  ExerciseTrackingType,
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

type EditableRoutineExercise = {
  id: string;
  exerciseId?: string;
  exerciseQuery: string;
  restSeconds: string;
  supersetGroup: string;
  /** The selected exercise's tracking type; decides the set columns (spec 0021). */
  trackingType?: ExerciseTrackingType;
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
    targetDuration: '',
    targetDistance: '',
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
    targetDuration:
      routineSet.targetDurationSeconds !== undefined
        ? formatDuration(routineSet.targetDurationSeconds)
        : '',
    targetDistance:
      routineSet.targetDistanceMeters !== undefined
        ? String(routineSet.targetDistanceMeters)
        : '',
    isWarmup: routineSet.isWarmup || undefined,
    generatedWarmup: (routineSet.isWarmup && routineSet.isGeneratedWarmup) || undefined,
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
    trackingType: routineExercise.trackingType,
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
  // The routine's warm-up block (spec 0024).
  const [warmUpItems, setWarmUpItems] = useState<EditableWarmUpItem[]>([]);
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
  // The row whose exercise is being replaced through the picker (spec 0020).
  const [replaceRowId, setReplaceRowId] = useState<string | null>(null);
  // Why approach sets could not be added to a row (spec 0024 EF-1).
  const [approachNotice, setApproachNotice] = useState<{
    exerciseRowId: string;
    outcome: RoutineApproachSetsNotice;
  } | null>(null);
  // The approach rows about to be added (spec 0031 FR-13); nothing changes
  // until confirmed.
  const [approachPreview, setApproachPreview] = useState<{
    exerciseRowId: string;
    preview: RoutineApproachSetsPreview;
  } | null>(null);
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
          setWarmUpItems(
            toEditableWarmUpItems(nextRoutine.warmUpItems, () => createRowId('warm-up-row')),
          );
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
              trackingType: undefined,
              exerciseQuery: value,
            }
          : exercise,
      ),
    );
  }

  function selectExercise(exerciseRowId: string, selectedExercise: Exercise) {
    setActiveExerciseSelectorRowId(null);
    setExercises((currentExercises) =>
      replaceRoutineRowExercise(currentExercises, exerciseRowId, selectedExercise),
    );
  }

  function handleReplaceExercise(selectedExercise: Exercise) {
    if (!replaceRowId) {
      return;
    }

    // The picker can create the exercise; keep the inline search aware of it.
    setAvailableExercises((currentExercises) =>
      upsertExercise(currentExercises, selectedExercise),
    );
    selectExercise(replaceRowId, selectedExercise);
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
    field: NumericSetField,
    value: string,
  ) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                // A changed generated row becomes the person's own (spec 0031 FR-7).
                set.id === setId ? editRoutineSetValue(set, field, value) : set,
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

  // The warm-up action as a toggle (spec 0031 FR-13): remove the generated
  // rows at once, or preview the ramp and add it on confirm.
  function handleWarmUpAction(exerciseRowId: string) {
    const exercise = exercises.find((item) => item.id === exerciseRowId);
    if (!exercise?.exerciseId) {
      return;
    }

    if (routineWarmUpActionFor(exercise.sets) === 'remove') {
      setApproachNotice(null);
      replaceRowSets(exerciseRowId, (sets) => removeRoutineGeneratedWarmUps(sets));
      return;
    }

    const result = previewRoutineApproachSets(exercise.sets, exercise.exerciseId, unit);
    if (result.outcome === 'preview') {
      setApproachNotice(null);
      setApproachPreview({ exerciseRowId, preview: result });
    } else {
      setApproachNotice({ exerciseRowId, outcome: result.outcome });
    }
  }

  function confirmApproachPreview() {
    const pending = approachPreview;
    setApproachPreview(null);
    if (!pending) {
      return;
    }

    // Exactly the rows shown (EF-2); nothing if the row went away or its
    // exercise was replaced (EF-1).
    setExercises((currentExercises) =>
      currentExercises.map((item) =>
        item.id === pending.exerciseRowId && item.exerciseId === pending.preview.exerciseId
          ? {
              ...item,
              sets: confirmRoutineApproachSets(item.sets, pending.preview, () =>
                createRowId('routine-set-row'),
              ),
            }
          : item,
      ),
    );
  }

  function replaceRowSets(
    exerciseRowId: string,
    update: (sets: EditableRoutineSet[]) => EditableRoutineSet[],
  ) {
    setExercises((currentExercises) =>
      currentExercises.map((item) =>
        item.id === exerciseRowId ? { ...item, sets: update(item.sets) } : item,
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

    const warmUpInput = toWarmUpItemsInput(warmUpItems);
    if (warmUpInput === null) {
      setErrorMessage(t('warmUp.invalidTarget'));
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

        // Only the fields the exercise tracks are saved (spec 0021 FR-3).
        const tracks = (field: Parameters<typeof tracksField>[1]) =>
          tracksField(exercise.trackingType, field);

        for (const [setIndex] of exercise.sets.entries()) {
          // Unedited fields inherit the previous set's value (the ghosted placeholder).
          const value = (field: NumericSetField) =>
            effectiveRoutineSetValue(exercise.sets, setIndex, field);
          const minReps = tracks('reps') ? parseOptionalInteger(value('minReps')) : undefined;
          const maxReps = tracks('reps') ? parseOptionalInteger(value('maxReps')) : undefined;
          const targetWeight = tracks('weight')
            ? parseOptionalNumber(value('targetWeight'))
            : undefined;
          const targetDurationSeconds = tracks('duration')
            ? parseDurationInput(value('targetDuration'))
            : undefined;
          const targetDistanceMeters = tracks('distance')
            ? parseDistanceInput(value('targetDistance'))
            : undefined;

          if (
            minReps === null ||
            maxReps === null ||
            targetWeight === null ||
            targetDurationSeconds === null ||
            targetDistanceMeters === null
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
            targetDurationSeconds,
            targetDistanceMeters,
            isWarmup: exercise.sets[setIndex]?.isWarmup || undefined,
            isGeneratedWarmup:
              (exercise.sets[setIndex]?.isWarmup && exercise.sets[setIndex]?.generatedWarmup) ||
              undefined,
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
          warmUpItems: warmUpInput,
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
        warmUpItems: warmUpInput,
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
      <View style={styles.screen}>
        <StateView
          kind="empty"
          icon="lock-closed-outline"
          message={t('routineForm.workoutInProgress')}
          actionLabel={t('routineForm.backToRoutine')}
          onAction={() => router.replace(`/routines/${routineId}`)}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" message={t('routineDetail.loading')} />
      </View>
    );
  }

  const retryExercises = () => {
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
  };

  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('routineForm.routineName')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('routineForm.routineNamePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.nameInput]}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('routineForm.description')}</Text>
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
            <Text style={styles.fieldLabel}>{t('routineForm.folder')}</Text>
            <View style={styles.iconInput}>
              <Ionicons name="folder-outline" size={18} color={colors.textMuted} />
              <TextInput
                value={folder}
                onChangeText={setFolder}
                placeholder={t('routineForm.folderPlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={styles.iconInputField}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <WarmUpBlockEditor
          items={warmUpItems}
          onChange={setWarmUpItems}
          createId={() => createRowId('warm-up-row')}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('routineForm.routineExercises')}</Text>
          <Chip label={String(exercises.length)} size="sm" />
        </View>
        <Text style={styles.meta}>{t('routineForm.exercisesHint')}</Text>
        {isExercisesLoading ? (
          <StateView kind="loading" message={t('routineForm.loadingExercises')} />
        ) : null}
        {exerciseLoadError ? (
          <StateView
            kind="error"
            message={exerciseLoadError}
            actionLabel={t('routineForm.retryExercises')}
            onAction={retryExercises}
          />
        ) : null}
        {exercises.map((exercise, index) => {
          const selectedName = exercise.exerciseId ? exercise.exerciseQuery : null;

          return (
            <View key={exercise.id} style={styles.card}>
              <View style={styles.exerciseHeader}>
                <View style={styles.indexBadge}>
                  <Text style={styles.indexBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.exerciseTitle}>
                  {selectedName || t('routineForm.exerciseN', { number: index + 1 })}
                </Text>
                <View style={styles.reorderRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="↑"
                    onPress={() => moveExerciseRow(index, 'up')}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="↓"
                    onPress={() => moveExerciseRow(index, 'down')}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <Ionicons name="arrow-down" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.iconInput}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
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
                  style={styles.iconInputField}
                />
              </View>
              {exercise.exerciseId ? (
                <Chip icon="checkmark-circle" tone="done" size="sm" label={t('routineForm.exerciseSelected')} />
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
                            styles.searchResult,
                            pressed ? styles.pressed : null,
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
                      {/* Offered for any search, not only an empty one (spec 0020 FR-2). */}
                      {!isExercisesLoading && !exerciseLoadError ? (
                        <Button
                          label={t('routineForm.createCustomExercise')}
                          icon="add-circle-outline"
                          variant="secondary"
                          fullWidth
                          onPress={() => openCustomExerciseModal(exercise.id)}
                        />
                      ) : null}
                    </View>
                  );
                })()
              ) : null}
              <View style={styles.metaInputsRow}>
                <View style={styles.metaField}>
                  <View style={styles.metaFieldLabel}>
                    <Ionicons name="timer-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.fieldLabel}>{t('routineForm.restBetweenSets')}</Text>
                  </View>
                  <TextInput
                    value={exercise.restSeconds}
                    onChangeText={(value) => updateExerciseRest(exercise.id, value)}
                    placeholder={t('routineForm.restPlaceholder')}
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="number-pad"
                    style={[styles.input, styles.cellInput]}
                  />
                </View>
                <View style={styles.metaField}>
                  <View style={styles.metaFieldLabel}>
                    <Ionicons name="flash-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.fieldLabel}>{t('routineForm.supersetGroup')}</Text>
                  </View>
                  <TextInput
                    value={exercise.supersetGroup}
                    onChangeText={(value) => updateExerciseSuperset(exercise.id, value)}
                    placeholder={t('routineForm.supersetPlaceholder')}
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="number-pad"
                    style={[styles.input, styles.cellInput]}
                  />
                </View>
              </View>
              <RoutineSetTable
                sets={exercise.sets}
                trackingType={exercise.trackingType}
                unit={unit}
                onChange={(setId, field, value) =>
                  updateSetField(exercise.id, setId, field, value)
                }
                onRemove={(setId) => removeSetRow(exercise.id, setId)}
              />
              <View style={styles.cardActions}>
                <Button
                  label={t('routineForm.addSet')}
                  icon="add"
                  variant="ghost"
                  onPress={() => addSetRow(exercise.id)}
                  style={styles.compactButton}
                />
                {exercise.exerciseId &&
                tracksField(exercise.trackingType, 'weight') &&
                tracksField(exercise.trackingType, 'reps') ? (
                  <WarmUpActionButton
                    action={routineWarmUpActionFor(exercise.sets)}
                    onPress={() => handleWarmUpAction(exercise.id)}
                    style={styles.iconButton}
                  />
                ) : null}
                {exercise.exerciseId ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('workouts.replaceExercise')}
                    onPress={() => setReplaceRowId(exercise.id)}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
                <Button
                  label={t('routineForm.removeExercise')}
                  variant="ghost"
                  destructive
                  onPress={() => removeExerciseRow(exercise.id)}
                  style={styles.compactButton}
                />
              </View>
              {approachNotice?.exerciseRowId === exercise.id ? (
                <Text style={styles.meta}>
                  {approachNotice.outcome === 'noWeight'
                    ? t('workouts.approachNoWeight')
                    : t('workouts.approachTooLight')}
                </Text>
              ) : null}
            </View>
          );
        })}
        <Button
          label={t('routineForm.addExercise')}
          icon="add-circle-outline"
          variant="secondary"
          fullWidth
          onPress={addExerciseRow}
        />
        {isEditMode && !routine ? (
          <Text style={styles.meta}>{t('routineDetail.notFoundResponse')}</Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.meta}>
            {`${t('routines.exerciseCount', { count: exercises.length })} · ${t('workouts.setsCount', { count: totalSets })}`}
          </Text>
          <Button
            label={
              isSubmitting
                ? t('routineForm.saving')
                : isEditMode
                  ? t('routineForm.saveRoutine')
                  : t('routines.createRoutine')
            }
            icon="checkmark-circle-outline"
            disabled={isSubmitting}
            fullWidth
            onPress={() => void handleSubmit()}
          />
          <View style={styles.links}>
            <Button
              label={t('routineDetail.backToRoutines')}
              variant="ghost"
              onPress={() => router.replace('/routines')}
            />
            {isEditMode && routine ? (
              <Button
                label={t('routineForm.openDetail')}
                variant="ghost"
                onPress={() => router.replace(`/routines/${routine.id}`)}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
      <ApproachSetsPreviewSheet
        preview={(() => {
          // Hidden once its row is gone or its exercise replaced (EF-1).
          const row = approachPreview
            ? exercises.find(
                (item) =>
                  item.id === approachPreview.exerciseRowId &&
                  item.exerciseId === approachPreview.preview.exerciseId,
              )
            : undefined;
          return approachPreview && row
            ? { ...approachPreview.preview, exerciseName: row.exerciseQuery }
            : null;
        })()}
        onConfirm={confirmApproachPreview}
        onCancel={() => setApproachPreview(null)}
      />
      <ExercisePickerModal
        visible={replaceRowId !== null}
        title={t('workouts.replaceTitle', {
          name: exercises.find((exercise) => exercise.id === replaceRowId)?.exerciseQuery ?? '',
        })}
        onClose={() => setReplaceRowId(null)}
        onSelect={handleReplaceExercise}
      />
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
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  pressed: {
    ...commonStyles.pressed,
  },
  error: {
    ...commonStyles.error,
  },
  meta: {
    ...commonStyles.meta,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...commonStyles.sectionLabel,
    fontSize: 11,
  },
  input: {
    ...commonStyles.input,
  },
  nameInput: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  iconInput: {
    ...commonStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 0,
  },
  iconInputField: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    color: colors.text,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...commonStyles.heading,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  indexBadge: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  indexBadgeText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  exerciseTitle: {
    ...commonStyles.cardTitle,
    flex: 1,
    paddingTop: 2,
  },
  reorderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  searchResults: {
    gap: spacing.xs,
  },
  searchResult: {
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchResultTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  metaInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaField: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing.xs,
  },
  metaFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cellInput: {
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  cardActions: {
    flexDirection: 'row',
    // Four actions may not fit a narrow phone (spec 0024 adds approach sets).
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactButton: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
