import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { Exercise } from '@workout/domain';

const MAX_VISIBLE = 50;

type ExercisePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
}: ExercisePickerModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const next = await exercisesClient.list();
      setExercises(
        next.slice().sort((left, right) => left.name.localeCompare(right.name)),
      );
      setHasLoaded(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load exercises.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && !hasLoaded && !isLoading) {
      void loadExercises();
    }
  }, [visible, hasLoaded, isLoading, loadExercises]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return exercises;
    }
    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(normalized),
    );
  }, [exercises, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add exercise</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          autoCorrect={false}
        />
        {isLoading ? <Text style={styles.meta}>Loading exercises...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.slice(0, MAX_VISIBLE).map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => {
                onSelect(exercise);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Text style={styles.rowTitle}>{exercise.name}</Text>
              {exercise.primaryMuscleGroups &&
              exercise.primaryMuscleGroups.length > 0 ? (
                <Text style={styles.meta}>
                  {exercise.primaryMuscleGroups.join(', ')}
                </Text>
              ) : null}
            </Pressable>
          ))}
          {filtered.length > MAX_VISIBLE ? (
            <Text style={styles.meta}>
              Refine your search to see the other {filtered.length - MAX_VISIBLE}.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  close: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    ...commonStyles.input,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    ...commonStyles.card,
    padding: 14,
    gap: spacing.xs,
  },
  rowPressed: {
    ...commonStyles.pressed,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  error: {
    ...commonStyles.error,
  },
});
