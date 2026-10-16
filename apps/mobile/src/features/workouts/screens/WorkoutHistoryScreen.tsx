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

import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { summarizeSession } from '@/features/workouts/utils/sessionStats';
import {
  activeDurationSeconds,
  formatDayHeading,
  formatDuration,
  formatTime,
} from '@/lib/format';
import { formatDistance } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { useRefresh } from '@/lib/useRefresh';
import { Chip } from '@/ui/Chip';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { WorkoutSession } from '@workout/domain';

export function WorkoutHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
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
      <ScreenTitle title={t('nav.history')} />
      {showLoading ? (
        <StateView kind="loading" message={t('workouts.loadingWorkouts')} />
      ) : null}
      {errorMessage ? (
        <StateView
          kind="error"
          message={errorMessage}
          actionLabel={t('common.retry')}
          onAction={() => void loadSessions()}
        />
      ) : null}
      {hasEmptyState ? (
        <StateView
          kind="empty"
          icon="time-outline"
          title={t('workouts.emptyTitle')}
          message={t('workouts.emptySubtitle')}
        />
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          {sessions.map((session) => {
            const when = session.completedAt ?? session.startedAt;
            const totals = summarizeSession(session);
            const exercises = session.exercises
              .slice()
              .sort((left, right) => left.order - right.order);
            const shown = exercises.slice(0, 3);

            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                onPress={() => router.push(`/workouts/${session.id}`)}
                style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle}>{formatDayHeading(when, i18n.language)}</Text>
                    <Text style={styles.meta}>{formatTime(session.startedAt, i18n.language)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                </View>
                <View style={styles.chips}>
                  {session.completedAt ? (
                    <Chip
                      icon="time-outline"
                      size="sm"
                      label={formatDuration(
                        activeDurationSeconds(
                          session.startedAt,
                          session.completedAt,
                          session.pausedSeconds,
                        ),
                      )}
                    />
                  ) : null}
                  {totals.volumeKg > 0 ? (
                    <Chip
                      icon="barbell-outline"
                      size="sm"
                      label={`${formatWeightValue(totals.volumeKg, unit)} ${unit}`}
                    />
                  ) : null}
                  {totals.durationSeconds > 0 ? (
                    <Chip
                      icon="stopwatch-outline"
                      size="sm"
                      label={formatDuration(totals.durationSeconds)}
                    />
                  ) : null}
                  {totals.distanceMeters > 0 ? (
                    <Chip
                      icon="map-outline"
                      size="sm"
                      label={formatDistance(totals.distanceMeters)}
                    />
                  ) : null}
                  <Chip
                    icon="layers-outline"
                    size="sm"
                    label={t('workouts.setsCount', { count: totals.totalSets })}
                  />
                </View>
                {shown.length === 0 ? (
                  <Text style={styles.meta}>{t('workouts.noExercises')}</Text>
                ) : (
                  <View style={styles.exerciseList}>
                    {shown.map((exercise) => (
                      <View key={exercise.id} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                        <Text style={styles.exerciseSets}>
                          {t('workouts.setsCount', { count: exercise.sets.length })}
                        </Text>
                      </View>
                    ))}
                    {exercises.length > shown.length ? (
                      <Text style={styles.more}>
                        {t('routines.moreExercises', { count: exercises.length - shown.length })}
                      </Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
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
  list: {
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeading: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...commonStyles.cardTitle,
  },
  meta: {
    ...commonStyles.meta,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseList: {
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  exerciseName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseSets: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  more: {
    color: colors.textSubtle,
    fontSize: 13,
  },
});
