import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [hasLoaded, setHasLoaded] = useState(false);
  const insets = useSafeAreaInsets();

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
        error instanceof Error ? error.message : t('exercises.loadError'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { paddingTop: Math.max(insets.top, spacing.md) }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('exercises.addExercise')}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            style={styles.closeButton}
          >
            <Text style={styles.close}>{t('common.close')}</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercises.searchPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          autoCorrect={false}
        />
        {isLoading ? <Text style={styles.meta}>{t('exercises.loading')}</Text> : null}
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
              {t('exercises.refineSearch', { count: filtered.length - MAX_VISIBLE })}
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
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
