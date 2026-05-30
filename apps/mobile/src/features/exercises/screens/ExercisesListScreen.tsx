import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { useRefresh } from '@/lib/useRefresh';
import type { Exercise } from '@workout/domain';

const MAX_VISIBLE = 50;

export function ExercisesListScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadExercises = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const nextExercises = await exercisesClient.list();

        if (shouldUpdate()) {
          setExercises(
            nextExercises
              .slice()
              .sort((left, right) => left.name.localeCompare(right.name)),
          );
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load exercises.',
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

      void loadExercises(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadExercises]),
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return exercises;
    }

    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(normalizedQuery),
    );
  }, [exercises, query]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const hiddenCount = filtered.length - visible.length;
  const { isRefreshing, onRefresh } = useRefresh(loadExercises);
  const showLoading = isLoading && exercises.length === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Exercises</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises"
        style={styles.input}
        autoCorrect={false}
      />
      {showLoading ? (
        <Text style={styles.meta}>Loading exercises...</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage ? (
        <Text style={styles.meta}>
          {filtered.length} exercises
          {hiddenCount > 0 ? ` · showing first ${MAX_VISIBLE}` : ''}
        </Text>
      ) : null}
      <View style={styles.list}>
        {visible.map((exercise) => (
          <Link
            key={exercise.id}
            href={`/exercises/${exercise.id}`}
            asChild
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Text style={styles.cardTitle}>{exercise.name}</Text>
              {exercise.primaryMuscleGroups &&
              exercise.primaryMuscleGroups.length > 0 ? (
                <Text style={styles.meta}>
                  {exercise.primaryMuscleGroups.join(', ')}
                </Text>
              ) : null}
            </Pressable>
          </Link>
        ))}
      </View>
      {hiddenCount > 0 ? (
        <Text style={styles.meta}>
          Refine your search to see the other {hiddenCount}.
        </Text>
      ) : null}
      <RouteLinks currentRoute="exercises" />
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
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
