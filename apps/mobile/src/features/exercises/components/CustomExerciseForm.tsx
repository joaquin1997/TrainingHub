import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Exercise, MuscleGroup } from '@workout/domain';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { ExercisePhotoField } from '@/features/exercises/components/ExercisePhotoField';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, spacing } from '@/ui/theme';

type CustomExerciseFormProps = {
  /** Prefilled name, usually the text searched (spec 0020 FR-2). */
  initialName: string;
  onCancel: () => void;
  onCreated: (exercise: Exercise) => void;
  /** Hidden when the host already titles the step. */
  showTitle?: boolean;
};

/**
 * Creates a custom exercise: name, primary muscle groups (at least one) and
 * secondary ones. Shared by the Exercises tab, the routine editor and the
 * exercise picker (spec 0020). Starts fresh on every mount.
 */
export function CustomExerciseForm({
  initialName,
  onCancel,
  onCreated,
  showTitle = true,
}: CustomExerciseFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [primaryMuscleGroupIds, setPrimaryMuscleGroupIds] = useState<string[]>([]);
  const [secondaryMuscleGroupIds, setSecondaryMuscleGroupIds] = useState<string[]>([]);
  const [photoBase64, setPhotoBase64] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoadingMuscleGroups, setIsLoadingMuscleGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setIsLoadingMuscleGroups(true);

    void exercisesClient
      .listMuscleGroups()
      .then((catalog) => {
        if (!isMounted) {
          return;
        }

        setMuscleGroups(catalog);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('customExercise.loadError'),
        );
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoadingMuscleGroups(false);
      });

    return () => {
      isMounted = false;
    };
    // Loads once per mount; the host remounts the form for a fresh start.
  }, []);

  function togglePrimaryMuscleGroup(muscleGroupId: string) {
    setPrimaryMuscleGroupIds((currentIds) =>
      currentIds.includes(muscleGroupId)
        ? currentIds.filter((id) => id !== muscleGroupId)
        : [...currentIds, muscleGroupId],
    );
    setSecondaryMuscleGroupIds((currentIds) =>
      currentIds.filter((id) => id !== muscleGroupId),
    );
  }

  function toggleSecondaryMuscleGroup(muscleGroupId: string) {
    setSecondaryMuscleGroupIds((currentIds) =>
      currentIds.includes(muscleGroupId)
        ? currentIds.filter((id) => id !== muscleGroupId)
        : [...currentIds, muscleGroupId],
    );
    setPrimaryMuscleGroupIds((currentIds) =>
      currentIds.filter((id) => id !== muscleGroupId),
    );
  }

  async function handleSubmit() {
    const trimmedName = name.trim();

    if (!trimmedName || primaryMuscleGroupIds.length === 0) {
      setErrorMessage(t('customExercise.validation'));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(undefined);
      const createdExercise = await exercisesClient.create({
        name: trimmedName,
        primaryMuscleGroupIds,
        secondaryMuscleGroupIds,
      });
      let result = createdExercise;
      if (photoBase64) {
        try {
          await exercisesClient.setPhoto(createdExercise.id, { imageBase64: photoBase64 });
          result = await exercisesClient.getById(createdExercise.id);
        } catch {
          // The exercise exists; the photo can be added from its detail.
          Alert.alert(t('customExercise.photoNotSaved'));
        }
      }
      onCreated(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('customExercise.createError'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderOptions = (
    selectedIds: string[],
    onToggle: (id: string) => void,
    keyPrefix: string,
  ) =>
    isLoadingMuscleGroups ? (
      <StateView kind="loading" message={t('customExercise.loadingMuscleGroups')} />
    ) : (
      <View style={styles.optionList}>
        {muscleGroups.map((muscleGroup) => (
          <Chip
            key={`${keyPrefix}-${muscleGroup.id}`}
            label={muscleGroup.name}
            selected={selectedIds.includes(muscleGroup.id)}
            onPress={() => onToggle(muscleGroup.id)}
          />
        ))}
      </View>
    );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {showTitle ? <Text style={styles.title}>{t('customExercise.title')}</Text> : null}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('customExercise.namePlaceholder')}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
      />
      <ExercisePhotoField
        photoBase64={photoBase64}
        onChange={setPhotoBase64}
        disabled={isSubmitting}
      />
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('customExercise.primaryTitle')}</Text>
        <Text style={styles.sectionHint}>{t('customExercise.selectOneOrMore')}</Text>
        {renderOptions(primaryMuscleGroupIds, togglePrimaryMuscleGroup, 'primary')}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('customExercise.secondaryTitle')}</Text>
        <Text style={styles.sectionHint}>{t('customExercise.optional')}</Text>
        {renderOptions(secondaryMuscleGroupIds, toggleSecondaryMuscleGroup, 'secondary')}
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Button
        label={isSubmitting ? t('routineForm.saving') : t('customExercise.saveExercise')}
        icon="checkmark-circle-outline"
        fullWidth
        disabled={isSubmitting || isLoadingMuscleGroups}
        onPress={() => void handleSubmit()}
      />
      <Button
        label={t('common.cancel')}
        variant="ghost"
        disabled={isSubmitting}
        onPress={onCancel}
        style={styles.centered}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    ...commonStyles.heading,
  },
  input: {
    ...commonStyles.input,
  },
  error: {
    ...commonStyles.error,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -spacing.xs,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  centered: {
    alignSelf: 'center',
  },
});
