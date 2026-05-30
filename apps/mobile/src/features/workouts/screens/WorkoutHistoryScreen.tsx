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

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { formatDate } from '@/lib/format';
import { useRefresh } from '@/lib/useRefresh';
import type { WorkoutSession } from '@workout/domain';

function countSets(session: WorkoutSession) {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
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
      <Text style={styles.title}>Workout History</Text>
      <Text style={styles.body}>
        Your saved workout sessions, loaded from the backend.
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
                  {session.status} · {session.exercises.length} exercises ·{' '}
                  {countSets(session)} sets
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
      <RouteLinks currentRoute="workout-history" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  stateCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 14,
    color: '#4b5563',
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
});
