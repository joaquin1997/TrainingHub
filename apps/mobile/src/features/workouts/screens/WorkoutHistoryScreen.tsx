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

import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import {
  durationSecondsBetween,
  formatDate,
  formatDuration,
} from '@/lib/format';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { WorkoutSession } from '@workout/domain';

function countSets(session: WorkoutSession) {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
}

function sessionVolume(session: WorkoutSession) {
  return Math.round(
    session.exercises.reduce(
      (total, exercise) =>
        total +
        exercise.sets.reduce(
          (sum, set) =>
            sum + (set.completedAt ? (set.reps ?? 0) * (set.weightKg ?? 0) : 0),
          0,
        ),
      0,
    ),
  );
}

export function WorkoutHistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

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
            error instanceof Error ? error.message : 'Unable to load workouts.',
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
      <Text style={styles.body}>
        Scan previous sessions and open the details behind each lift.
      </Text>
      {showLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>Loading workouts...</Text>
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.error}>{errorMessage}</Text>
        </View>
      ) : null}
      {hasEmptyState ? (
        <View style={styles.stateCard}>
          <Text style={styles.meta}>No workouts yet.</Text>
          <Text style={styles.meta}>Finish a workout to see it here.</Text>
        </View>
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
                <Text style={styles.cardMeta}>
                  {session.exercises.length} exercises · {countSets(session)} sets
                  {sessionVolume(session) > 0
                    ? ` · ${sessionVolume(session)} kg`
                    : ''}
                  {session.completedAt
                    ? ` · ${formatDuration(
                        durationSecondsBetween(
                          session.startedAt,
                          session.completedAt,
                        ),
                      )}`
                    : ''}
                </Text>
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
    fontWeight: '700',
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
});
