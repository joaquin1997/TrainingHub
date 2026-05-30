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

import { exercisesClient } from '@/features/routines/api/exercisesClient';

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
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    maxHeight: '85%',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 20,
  },
  content: {
    gap: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
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
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  helperText: {
    fontSize: 14,
    color: '#4b5563',
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  optionChipSelected: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  optionText: {
    fontSize: 14,
    color: '#111827',
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
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
  secondaryButton: {
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
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
