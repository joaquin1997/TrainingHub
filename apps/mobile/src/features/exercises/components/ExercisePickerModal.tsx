import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { CustomExerciseForm } from '@/features/exercises/components/CustomExerciseForm';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import {
  isExerciseGone,
  needsAvailabilityCheck,
} from '@/features/exercises/utils/exerciseAvailability';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { ListRow } from '@/ui/ListRow';
import type { Exercise } from '@workout/domain';

const MAX_VISIBLE = 50;

/** A question asked inside the picker before a choice is applied. */
export type PickerConfirmation = {
  title: string;
  message: string;
  /** The first action is the default and is drawn as the primary button. */
  actions: { label: string; destructive?: boolean; onPress: () => void }[];
};

type ExercisePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** Header title; "Add exercise" by default. */
  title?: string;
  /**
   * Asked after an exercise is chosen (or created); `null` applies the choice
   * at once. The question stays inside this modal, so nothing has to open
   * while the picker is closing (spec 0020 EF-1).
   */
  confirm?: (exercise: Exercise) => PickerConfirmation | null;
};

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  title,
  confirm,
}: ExercisePickerModalProps) {
  useTheme();
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [hasLoaded, setHasLoaded] = useState(false);
  // 'create' swaps the list for the create form, inside this same modal: a
  // modal over a modal is unreliable on iOS (spec 0020).
  const [step, setStep] = useState<'list' | 'create'>('list');
  const [confirmation, setConfirmation] = useState<PickerConfirmation | null>(null);
  // Spec 0015 EF-4: a custom exercise from a list loaded earlier may be gone.
  const [notice, setNotice] = useState<string>();
  const [checkingId, setCheckingId] = useState<string>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Each opening starts clean: add and replace share one picker.
    if (visible) {
      setQuery('');
      setStep('list');
      setConfirmation(null);
      setNotice(undefined);
    }
  }, [visible]);

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

  const apply = (exercise: Exercise) => {
    const question = confirm?.(exercise) ?? null;

    if (question) {
      setStep('list');
      setConfirmation(question);
      return;
    }

    onSelect(exercise);
    onClose();
  };

  /**
   * A custom exercise is re-checked before it is used: custom exercises are
   * private (spec 0015), and a list loaded before that may offer someone
   * else's. "Not found" drops it with a notice and reloads the list (EF-4);
   * any other failure lets the choice through, so offline still works.
   */
  const choose = async (exercise: Exercise) => {
    if (checkingId) {
      return;
    }
    setNotice(undefined);

    if (needsAvailabilityCheck(exercise)) {
      setCheckingId(exercise.id);
      try {
        await exercisesClient.getById(exercise.id);
      } catch (error) {
        if (isExerciseGone(error)) {
          setExercises((current) => current.filter((item) => item.id !== exercise.id));
          setNotice(t('exercises.noLongerAvailable'));
          void loadExercises();
          return;
        }
      } finally {
        setCheckingId(undefined);
      }
    }

    apply(exercise);
  };

  const handleCreated = (created: Exercise) => {
    setExercises((current) =>
      [...current.filter((exercise) => exercise.id !== created.id), created].sort(
        (left, right) => left.name.localeCompare(right.name),
      ),
    );
    // Just created by this person: nothing to re-check.
    apply(created);
  };

  const trimmedQuery = query.trim();

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
          <Text style={styles.title}>
            {step === 'create'
              ? t('customExercise.title')
              : (title ?? t('exercises.addExercise'))}
          </Text>
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
        {confirmation ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>{confirmation.title}</Text>
            <Text style={styles.meta}>{confirmation.message}</Text>
            {confirmation.actions.map((action, index) => (
              <Button
                key={action.label}
                label={action.label}
                variant={index === 0 ? 'primary' : action.destructive ? 'danger' : 'secondary'}
                fullWidth
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              />
            ))}
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => setConfirmation(null)}
              style={styles.centered}
            />
          </View>
        ) : step === 'create' ? (
          <CustomExerciseForm
            initialName={trimmedQuery}
            showTitle={false}
            onCancel={() => setStep('list')}
            onCreated={handleCreated}
          />
        ) : (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                keyboardAppearance="dark"
                value={query}
                onChangeText={setQuery}
                placeholder={t('exercises.searchPlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={styles.searchInput}
                autoCorrect={false}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('create')}
              style={({ pressed }) => [styles.createRow, pressed ? styles.rowPressed : null]}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primaryInk} />
              <Text style={styles.createLabel} numberOfLines={1}>
                {trimmedQuery
                  ? t('exercises.createNamed', { name: trimmedQuery })
                  : t('exercises.createExercise')}
              </Text>
            </Pressable>
            {notice ? (
              <Text style={styles.notice} accessibilityRole="alert">
                {notice}
              </Text>
            ) : null}
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
                  <ListRow
                    key={exercise.id}
                    variant="card"
                    title={exercise.name}
                    subtitle={details.length > 0 ? details.join(' · ') : undefined}
                    leading={<ExerciseThumb imageUrl={exercise.imageUrl} />}
                    trailing={
                      <Ionicons name="add-circle-outline" size={24} color={colors.primaryInk} />
                    }
                    onPress={() => void choose(exercise)}
                    disabled={checkingId !== undefined}
                  />
                );
              })}
              {filtered.length > MAX_VISIBLE ? (
                <Text style={styles.more}>
                  {t('exercises.refineSearch', { count: filtered.length - MAX_VISIBLE })}
                </Text>
              ) : null}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = createStyles(() => ({
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
    borderRadius: radii.round,
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
    ...typeScale.body,
  },
  confirm: {
    gap: spacing.md,
  },
  confirmTitle: {
    ...typeScale.heading,
    color: colors.text,
  },
  centered: {
    alignSelf: 'center',
  },
  notice: {
    color: colors.dangerInk,
    ...typeScale.caption,
  },
  createRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  createLabel: {
    flex: 1,
    color: colors.primaryInk,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  rowPressed: {
    ...commonStyles.pressed,
  },
  meta: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
  more: {
    ...commonStyles.meta,
    textAlign: 'center',
  },
}));
