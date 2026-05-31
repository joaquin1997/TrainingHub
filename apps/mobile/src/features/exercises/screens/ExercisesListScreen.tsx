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
import {
  buildExerciseFacets,
  filterExercises,
} from '@/features/exercises/utils/exerciseFilters';
import { useRefresh } from '@/lib/useRefresh';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { Exercise } from '@workout/domain';

const MAX_VISIBLE = 50;

export function ExercisesListScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>();
  const [equipment, setEquipment] = useState<string>();
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

  const facets = useMemo(() => buildExerciseFacets(exercises), [exercises]);

  const filtered = useMemo(
    () => filterExercises(exercises, { query, category, equipment }),
    [exercises, query, category, equipment],
  );

  const toggle = (
    current: string | undefined,
    value: string,
    set: (next: string | undefined) => void,
  ) => set(current === value ? undefined : value);

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
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        autoCorrect={false}
      />
      {facets.categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {facets.categories.map((value) => (
            <Pressable
              key={value}
              onPress={() => toggle(category, value, setCategory)}
              style={[styles.chip, category === value ? styles.chipActive : null]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === value ? styles.chipTextActive : null,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {facets.equipment.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {facets.equipment.map((value) => (
            <Pressable
              key={value}
              onPress={() => toggle(equipment, value, setEquipment)}
              style={[styles.chip, equipment === value ? styles.chipActive : null]}
            >
              <Text
                style={[
                  styles.chipText,
                  equipment === value ? styles.chipTextActive : null,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {showLoading ? (
        <Text style={styles.meta}>Loading exercises...</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage ? (
        <Text style={styles.meta}>
          {filtered.length} exercises
          {hiddenCount > 0 ? ` - showing first ${MAX_VISIBLE}` : ''}
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
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  title: {
    ...commonStyles.title,
  },
  input: {
    ...commonStyles.input,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
});
