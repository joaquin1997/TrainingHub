import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
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
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
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
  const elapsedSeconds = useElapsedSeconds(activeWorkout?.startedAt, {
    pausedAt: activeWorkout?.pausedAt,
    pausedSeconds: activeWorkout?.pausedSeconds,
  });
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

  const startTarget = (routine: Routine) =>
    activeWorkout && activeWorkout.routineId !== routine.id
      ? activeWorkout.routineId
      : routine.id;

  const startLabel = (routine: Routine) => {
    if (activeWorkout?.routineId === routine.id) {
      return t('routines.continueWorkout');
    }
    return activeWorkout ? t('routines.resumeWorkout') : t('routines.startWorkout');
  };

  return (
    <>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.body}>{t('routines.intro')}</Text>
      {activeWorkout ? (
        <Link
          href={{
            pathname: '/workouts/active',
            params: { routineId: activeWorkout.routineId },
          }}
          asChild
        >
          <Pressable style={styles.banner}>
            <Text style={styles.bannerTitle}>
              {t(
                activeWorkout.pausedAt
                  ? 'routines.workoutPaused'
                  : 'routines.workoutInProgress',
                { duration: formatDuration(elapsedSeconds) },
              )}
            </Text>
            <Text style={styles.bannerMeta}>
              {t('routines.tapToResume', { name: activeWorkout.routineName })}
            </Text>
          </Pressable>
        </Link>
      ) : null}
      <Button
        label={t('routines.createRoutine')}
        onPress={() => router.push('/routines/create')}
        fullWidth
      />
      {showLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>{t('routines.loadingRoutines')}</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.error}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadRoutines()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {hasEmptyState ? (
        <EmptyState
          icon="barbell-outline"
          title={t('routines.emptyTitle')}
          subtitle={t('routines.emptySubtitle')}
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
                <Text style={styles.folderTitle}>
                  {group.folder ?? t('routines.ungrouped')}
                </Text>
              ) : null}
              {group.routines.map((routine) => (
                <Pressable
                  key={routine.id}
                  onPress={() => router.push(`/routines/${routine.id}`)}
                  style={({ pressed }) => [
                    styles.card,
                    pressed ? styles.cardPressed : null,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {routine.name}
                    </Text>
                    <Pressable
                      onPress={() => setMenuRoutine(routine)}
                      hitSlop={10}
                      accessibilityRole="button"
                      style={styles.menuButton}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {getRoutineExerciseSummary(routine)}
                  </Text>
                  <Button
                    label={startLabel(routine)}
                    onPress={() =>
                      router.push({
                        pathname: '/workouts/active',
                        params: { routineId: startTarget(routine) },
                      })
                    }
                    fullWidth
                  />
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  title: {
    ...commonStyles.title,
  },
  body: {
    ...commonStyles.body,
  },
  banner: {
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bannerTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  bannerMeta: {
    color: colors.onPrimary,
    fontSize: 14,
  },
  list: {
    gap: spacing.lg,
  },
  folderGroup: {
    gap: spacing.sm,
  },
  folderTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stateCard: {
    ...commonStyles.card,
  },
  card: {
    ...commonStyles.card,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  menuButton: {
    padding: spacing.xs,
  },
  cardMeta: {
    ...commonStyles.meta,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
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
});
