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

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, spacing } from '@/ui/theme';
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
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.rowPressed : null]}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('exercises.searchPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>
        {isLoading ? <StateView kind="loading" message={t('exercises.loading')} /> : null}
        {errorMessage ? (
          <StateView
            kind="error"
            message={errorMessage}
            actionLabel={t('common.retry')}
            onAction={() => void loadExercises()}
          />
        ) : null}
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.slice(0, MAX_VISIBLE).map((exercise) => {
            const details = [
              exercise.primaryMuscleGroups?.join(', '),
              exercise.equipment?.join(', '),
            ].filter(Boolean);

            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(exercise);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
              >
                <ExerciseThumb imageUrl={exercise.imageUrl} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{exercise.name}</Text>
                  {details.length > 0 ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {details.join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </Pressable>
            );
          })}
          {filtered.length > MAX_VISIBLE ? (
            <Text style={styles.more}>
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
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...commonStyles.heading,
    flexShrink: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
  },
  search: {
    ...commonStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    color: colors.text,
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowPressed: {
    ...commonStyles.pressed,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 21,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  more: {
    ...commonStyles.meta,
    textAlign: 'center',
  },
});
