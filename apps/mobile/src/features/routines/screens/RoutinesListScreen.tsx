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
import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/utils/routineSummary';
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { useRefresh } from '@/lib/useRefresh';
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Routines List</Text>
      <Text style={styles.body}>
        Routines are loaded from the backend. Template data stays separate from
        workout execution.
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
              Workout in progress · {formatDuration(elapsedSeconds)}
            </Text>
            <Text style={styles.bannerMeta}>
              {activeWorkout.routineName} · tap to resume
            </Text>
          </Pressable>
        </Link>
      ) : null}
      <Link href="/routines/create" style={styles.primaryLink}>
        Create routine
      </Link>
      <View style={styles.links}>
        <Link href="/exercises" style={styles.link}>
          Exercises
        </Link>
        <Link href="/progress" style={styles.link}>
          Progress
        </Link>
        <Link href="/workouts/history" style={styles.link}>
          History
        </Link>
      </View>
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
          <Text style={styles.meta}>
            Create one to verify the API flow.
          </Text>
        </View>
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          {routines.map((routine) => (
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
                <Link href={`/routines/edit/${routine.id}`} style={styles.link}>
                  Edit routine
                </Link>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <RouteLinks currentRoute="routines" />
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
  primaryLink: {
    fontSize: 16,
    color: '#2563eb',
  },
  banner: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 16,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bannerMeta: {
    fontSize: 14,
    color: '#d1d5db',
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
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
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
