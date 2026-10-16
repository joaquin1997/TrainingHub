import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Exercise, ExerciseTrackingType, MuscleGroup } from '@workout/domain';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { TRACKING_TYPES } from '@/lib/tracking';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

type CustomExerciseModalProps = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
};

export function CustomExerciseModal({
  visible,
  initialName,
  onClose,
  onCreated,
}: CustomExerciseModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [primaryMuscleGroupIds, setPrimaryMuscleGroupIds] = useState<string[]>([]);
  const [secondaryMuscleGroupIds, setSecondaryMuscleGroupIds] = useState<string[]>([]);
  const [trackingType, setTrackingType] = useState<ExerciseTrackingType>('weight_reps');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoadingMuscleGroups, setIsLoadingMuscleGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    setName(initialName);
    setPrimaryMuscleGroupIds([]);
    setSecondaryMuscleGroupIds([]);
    setTrackingType('weight_reps');
    setErrorMessage(undefined);
    setIsLoadingMuscleGroups(true);
    setIsSubmitting(false);

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
  }, [initialName, visible]);

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
        trackingType,
      });
      onCreated(createdExercise);
      onClose();
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
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>{t('customExercise.title')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('customExercise.namePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
            />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('customExercise.trackingTitle')}</Text>
              <View style={styles.optionList}>
                {TRACKING_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={t(`customExercise.trackingTypes.${type}`)}
                    selected={trackingType === type}
                    onPress={() => setTrackingType(type)}
                  />
                ))}
              </View>
            </View>
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
              onPress={onClose}
              style={styles.centered}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    maxHeight: '85%',
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
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
