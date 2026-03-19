import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { routinesClient } from '@/features/routines/api/routinesClient';
import { getRoutineExerciseSummary } from '@/features/routines/mocks/mockRoutines';
import type { Routine } from '@workout/domain';

export function RoutinesListScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadRoutines = useCallback(() => {
    let isMounted = true;

    async function loadRoutines() {
      setIsLoading(true);

      try {
        setErrorMessage(undefined);
        const nextRoutines = await routinesClient.list();

        if (isMounted) {
          setRoutines(nextRoutines);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load routines.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRoutines();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(loadRoutines);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routines List</Text>
      <Text style={styles.body}>
        Routines are loaded from the backend. Template data stays separate from
        workout execution.
      </Text>
      <Link href="/routines/create" style={styles.primaryLink}>
        Create routine
      </Link>
      {isLoading ? <Text style={styles.meta}>Loading routines...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage ? (
        <View style={styles.list}>
          {routines.length === 0 ? (
            <Text style={styles.meta}>
              No routines yet. Create one to verify the API flow.
            </Text>
          ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  list: {
    gap: 12,
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
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
