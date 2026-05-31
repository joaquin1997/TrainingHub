import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { routinesClient } from '@/features/routines/api/routinesClient';
import { groupRoutinesByFolder } from '@/features/routines/utils/groupRoutinesByFolder';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { Routine } from '@workout/domain';

export function RoutinesListScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

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
            error instanceof Error ? error.message : 'Unable to load routines.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [],
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

  const activeWorkout = useActiveWorkout();
  const elapsedSeconds = useElapsedSeconds(activeWorkout?.startedAt);
  const { isRefreshing, onRefresh } = useRefresh(loadRoutines);
  const showLoading = isLoading && routines.length === 0;
  const hasEmptyState = !isLoading && !errorMessage && routines.length === 0;
  const hasListState = !errorMessage && routines.length > 0;
  const folderGroups = groupRoutinesByFolder(routines);
  const showFolderHeaders = folderGroups.some((group) => group.folder);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.body}>
        Pick a plan, start lifting, or build a new routine from the exercise
        catalog.
      </Text>
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
              Workout in progress - {formatDuration(elapsedSeconds)}
            </Text>
            <Text style={styles.bannerMeta}>
              {activeWorkout.routineName} - tap to resume
            </Text>
          </Pressable>
        </Link>
      ) : null}
      <Link href="/routines/create" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Create routine</Text>
        </Pressable>
      </Link>
      {showLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>Loading routines...</Text>
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
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {hasEmptyState ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>No routines yet.</Text>
          <Text style={styles.meta}>Create your first plan to start logging.</Text>
        </View>
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
                  {group.folder ?? 'Ungrouped'}
                </Text>
              ) : null}
              {group.routines.map((routine) => (
                <View key={routine.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{routine.name}</Text>
                  {routine.description ? (
                    <Text style={styles.cardBody}>{routine.description}</Text>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    Exercises: {getRoutineExerciseSummary(routine)}
                  </Text>
                  <View style={styles.links}>
                    <Link href={`/routines/${routine.id}`} style={styles.link}>
                      Open detail
                    </Link>
                    <Link
                      href={`/routines/edit/${routine.id}`}
                      style={styles.link}
                    >
                      Edit routine
                    </Link>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  primaryButton: {
    ...commonStyles.primaryButton,
  },
  primaryButtonText: {
    ...commonStyles.primaryButtonText,
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
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  link: {
    ...commonStyles.link,
  },
});
