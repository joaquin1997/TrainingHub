import { Link, useFocusEffect } from 'expo-router';
import type { TFunction } from 'i18next';
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

import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { isPerformedSet } from '@/features/workouts/utils/performedSet';
import {
  durationSecondsBetween,
  formatDate,
  formatDuration,
} from '@/lib/format';
import { fromKg, roundWeight } from '@/lib/weight';
import { useRefresh } from '@/lib/useRefresh';
import { EmptyState } from '@/ui/EmptyState';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { WorkoutSession } from '@workout/domain';

function countSets(session: WorkoutSession) {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
}

function exerciseSummary(session: WorkoutSession, t: TFunction) {
  const names = session.exercises
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((exercise) => exercise.exerciseName);

  if (names.length === 0) {
    return t('workouts.noExercises');
  }

  const shown = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}

function sessionVolume(session: WorkoutSession) {
  return Math.round(
    session.exercises.reduce(
      (total, exercise) =>
        total +
        exercise.sets.reduce(
          (sum, set) =>
            sum +
            (isPerformedSet(set) ? (set.reps ?? 0) * (set.weightKg ?? 0) : 0),
          0,
        ),
      0,
    ),
  );
}

export function WorkoutHistoryScreen() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadSessions = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextSessions = await workoutsClient.list();

        if (shouldUpdate()) {
          setSessions(nextSessions);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('workouts.loadError'),
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

      void loadSessions(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadSessions]),
  );

  const { isRefreshing, onRefresh } = useRefresh(loadSessions);
  const showLoading = isLoading && sessions.length === 0;
  const hasEmptyState = !isLoading && !errorMessage && sessions.length === 0;
  const hasListState = !errorMessage && sessions.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.body}>{t('workouts.historyIntro')}</Text>
      {showLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>{t('workouts.loadingWorkouts')}</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : null}
      {hasEmptyState ? (
        <EmptyState
          icon="time-outline"
          title={t('workouts.emptyTitle')}
          subtitle={t('workouts.emptySubtitle')}
        />
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          {sessions.map((session) => (
            <Link key={session.id} href={`/workouts/${session.id}`} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed ? styles.cardPressed : null,
                ]}
              >
                <Text style={styles.cardTitle}>
                  {formatDate(session.completedAt ?? session.startedAt)}
                </Text>
                <Text style={styles.cardSummary} numberOfLines={1}>
                  {exerciseSummary(session, t)}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={styles.stat}>
                    {t('workouts.setsCount', { count: countSets(session) })}
                  </Text>
                  {sessionVolume(session) > 0 ? (
                    <Text style={[styles.stat, styles.statStrong]}>
                      {roundWeight(fromKg(sessionVolume(session), unit))} {unit}
                    </Text>
                  ) : null}
                  {session.completedAt ? (
                    <Text style={styles.stat}>
                      {formatDuration(
                        durationSecondsBetween(
                          session.startedAt,
                          session.completedAt,
                        ),
                      )}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </Link>
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
  list: {
    gap: spacing.md,
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
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSummary: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  stat: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  statStrong: {
    color: colors.onPrimary,
    backgroundColor: colors.primary,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
});
