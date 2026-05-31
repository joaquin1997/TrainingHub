import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Exercise, MuscleGroup } from '@workout/domain';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
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
  const [name, setName] = useState(initialName);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [primaryMuscleGroupIds, setPrimaryMuscleGroupIds] = useState<string[]>([]);
  const [secondaryMuscleGroupIds, setSecondaryMuscleGroupIds] = useState<string[]>([]);
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
            : 'Unable to load muscle groups.',
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
      setErrorMessage('Name and at least one primary muscle group are required.');
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
      onCreated(createdExercise);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create exercise.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          >
            <Text style={styles.title}>Create Custom Exercise</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
            />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Primary muscle groups</Text>
              <Text style={styles.sectionHint}>Select one or more.</Text>
              {isLoadingMuscleGroups ? (
                <Text style={styles.helperText}>Loading muscle groups...</Text>
              ) : (
                <View style={styles.optionList}>
                  {muscleGroups.map((muscleGroup) => {
                    const isSelected = primaryMuscleGroupIds.includes(
                      muscleGroup.id,
                    );

                    return (
                      <Pressable
                        key={`primary-${muscleGroup.id}`}
                        accessibilityRole="button"
                        onPress={() => togglePrimaryMuscleGroup(muscleGroup.id)}
                        style={({ pressed }) => [
                          styles.optionChip,
                          isSelected ? styles.optionChipSelected : null,
                          pressed ? styles.buttonPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected ? styles.optionTextSelected : null,
                          ]}
                        >
                          {muscleGroup.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Secondary muscle groups</Text>
              <Text style={styles.sectionHint}>Optional.</Text>
              {isLoadingMuscleGroups ? (
                <Text style={styles.helperText}>Loading muscle groups...</Text>
              ) : (
                <View style={styles.optionList}>
                  {muscleGroups.map((muscleGroup) => {
                    const isSelected = secondaryMuscleGroupIds.includes(
                      muscleGroup.id,
                    );

                    return (
                      <Pressable
                        key={`secondary-${muscleGroup.id}`}
                        accessibilityRole="button"
                        onPress={() => toggleSecondaryMuscleGroup(muscleGroup.id)}
                        style={({ pressed }) => [
                          styles.optionChip,
                          isSelected ? styles.optionChipSelected : null,
                          pressed ? styles.buttonPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected ? styles.optionTextSelected : null,
                          ]}
                        >
                          {muscleGroup.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                  isSubmitting ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleSubmit()}
                disabled={isSubmitting || isLoadingMuscleGroups}
                style={({ pressed }) => [
                  styles.button,
                  pressed ? styles.buttonPressed : null,
                  isSubmitting || isLoadingMuscleGroups ? styles.buttonDisabled : null,
                ]}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? 'Saving...' : 'Save exercise'}
                </Text>
              </Pressable>
            </View>
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
    padding: spacing.xl,
  },
  sheet: {
    maxHeight: '85%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
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
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  helperText: {
    ...commonStyles.meta,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  optionChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
  },
  optionTextSelected: {
    color: colors.onPrimary,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    ...commonStyles.primaryButton,
  },
  buttonText: {
    ...commonStyles.primaryButtonText,
  },
  secondaryButton: {
    ...commonStyles.secondaryButton,
  },
  secondaryButtonText: {
    ...commonStyles.secondaryButtonText,
  },
  buttonPressed: {
    ...commonStyles.pressed,
  },
  buttonDisabled: {
    ...commonStyles.disabled,
  },
});
