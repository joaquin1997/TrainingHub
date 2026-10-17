import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { buildRoutineCopyInput } from '@/features/routines/utils/duplicateRoutine';
import { groupRoutinesByFolder } from '@/features/routines/utils/groupRoutinesByFolder';
import { getRoutineExerciseNames } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { useRoutineStart } from '@/features/workouts/hooks/useRoutineStart';
import { ActionSheet } from '@/ui/ActionSheet';
import { CardHeader } from '@/ui/CardHeader';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { confirmAction } from '@/lib/confirmAction';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, spacing } from '@/ui/theme';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import type { Routine } from '@workout/domain';

export function RoutinesListScreen() {
  const { t } = useTranslation();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [menuRoutine, setMenuRoutine] = useState<Routine | null>(null);

  const loadRoutines = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextRoutines = await routinesClient.list();

        if (shouldUpdate()) {
          setRoutines(nextRoutines);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('routines.loadError'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadRoutines(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadRoutines]),
  );

  const router = useRouter();
  const activeWorkout = useActiveWorkout();
  const { isRefreshing, onRefresh } = useRefresh(loadRoutines);
  const showLoading = isLoading && routines.length === 0;
  const hasEmptyState = !isLoading && !errorMessage && routines.length === 0;
  const hasListState = !errorMessage && routines.length > 0;
  const folderGroups = groupRoutinesByFolder(routines);
  const showFolderHeaders = folderGroups.some((group) => group.folder);

  const handleDuplicate = async (routine: Routine) => {
    try {
      await routinesClient.create(buildRoutineCopyInput(routine));
      await loadRoutines();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('routines.duplicateError'),
      );
    }
  };

  const handleDelete = async (routine: Routine) => {
    const confirmed = await confirmAction({
      title: t('routines.deleteTitle'),
      message: t('routines.deleteConfirm', { name: routine.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await routinesClient.remove(routine.id);
      await loadRoutines();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('routines.deleteError'),
      );
    }
  };

  const menuRoutineLocked =
    menuRoutine !== null && activeWorkout?.routineId === menuRoutine.id;

  // Another routine's Start asks before replacing the workout (spec 0019).
  const { startRoutine, sheet: switchSheet } = useRoutineStart();

  const startLabel = (routine: Routine) =>
    activeWorkout?.routineId === routine.id
      ? t('routines.continueWorkout')
      : t('routines.startWorkout');

  return (
    <>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <ScreenTitle
        title={t('nav.routines')}
        action={{
          label: t('routines.newRoutine'),
          icon: 'add',
          onPress: () => router.push('/routines/create'),
        }}
      />
      {showLoading ? (
        <StateView kind="loading" message={t('routines.loadingRoutines')} />
      ) : null}
      {errorMessage ? (
        <StateView
          kind="error"
          message={errorMessage}
          actionLabel={t('common.retry')}
          onAction={() => void loadRoutines()}
        />
      ) : null}
      {hasEmptyState ? (
        <StateView
          kind="empty"
          icon="clipboard-outline"
          title={t('routines.emptyTitle')}
          message={t('routines.emptySubtitle')}
          actionLabel={t('routines.createRoutine')}
          onAction={() => router.push('/routines/create')}
        />
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          {folderGroups.map((group) => (
            <View
              key={group.folder ?? '__unfiled__'}
              style={styles.folderGroup}
            >
              {showFolderHeaders ? (
                <View style={styles.folderHeader}>
                  <Ionicons
                    name={group.folder ? 'folder-outline' : 'albums-outline'}
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text style={styles.sectionLabel}>
                    {group.folder ?? t('routines.ungrouped')}
                  </Text>
                  <Text style={styles.folderCount}>{group.routines.length}</Text>
                </View>
              ) : null}
              {group.routines.map((routine) => {
                const names = getRoutineExerciseNames(routine);
                const shown = names.slice(0, 3);
                const isActive = activeWorkout?.routineId === routine.id;

                return (
                  <Pressable
                    key={routine.id}
                    onPress={() => router.push(`/routines/${routine.id}`)}
                    style={({ pressed }) => [
                      styles.card,
                      isActive ? styles.cardActive : null,
                      pressed ? styles.cardPressed : null,
                    ]}
                  >
                    <CardHeader
                      title={routine.name}
                      trailing={
                        <Pressable
                          onPress={() => setMenuRoutine(routine)}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.edit')}
                          style={styles.menuButton}
                        >
                          <Ionicons
                            name="ellipsis-vertical"
                            size={18}
                            color={colors.textMuted}
                          />
                        </Pressable>
                      }
                    >
                      <View style={styles.metaRow}>
                        <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.meta}>
                          {t('routines.exerciseCount', { count: names.length })}
                        </Text>
                      </View>
                    </CardHeader>
                    {shown.length > 0 ? (
                      <View style={styles.chips}>
                        {shown.map((name, index) => (
                          <Chip key={`${name}-${index}`} label={name} size="sm" />
                        ))}
                        {names.length > shown.length ? (
                          <Chip
                            label={t('routines.moreExercises', {
                              count: names.length - shown.length,
                            })}
                            size="sm"
                          />
                        ) : null}
                      </View>
                    ) : null}
                    <Button
                      label={startLabel(routine)}
                      icon="play"
                      variant="secondary"
                      onPress={() => startRoutine(routine)}
                      fullWidth
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
    <ActionSheet {...switchSheet} />
    <ActionSheet
      visible={menuRoutine !== null}
      title={menuRoutine?.name}
      message={menuRoutineLocked ? t('routineDetail.editLocked') : undefined}
      onClose={() => setMenuRoutine(null)}
      actions={
        menuRoutine
          ? [
              // The active workout's routine can be neither edited nor deleted
              // until the workout is finished or discarded (spec 0014).
              ...(menuRoutineLocked
                ? []
                : [
                    {
                      label: t('common.edit'),
                      onPress: () =>
                        router.push(`/routines/edit/${menuRoutine.id}`),
                    },
                  ]),
              {
                label: t('routines.duplicate'),
                onPress: () => void handleDuplicate(menuRoutine),
              },
              ...(menuRoutineLocked
                ? []
                : [
                    {
                      label: t('common.delete'),
                      destructive: true,
                      onPress: () => void handleDelete(menuRoutine),
                    },
                  ]),
            ]
          : []
      }
    />
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
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  meta: {
    ...commonStyles.meta,
  },
  list: {
    gap: spacing.xl,
  },
  folderGroup: {
    gap: spacing.md,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  folderCount: {
    ...commonStyles.sectionLabel,
    color: colors.textSubtle,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  cardActive: {
    borderColor: colors.primary,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
