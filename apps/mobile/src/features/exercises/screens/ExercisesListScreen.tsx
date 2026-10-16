import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import {
  buildExerciseFacets,
  filterExercises,
} from '@/features/exercises/utils/exerciseFilters';
import { useRefresh } from '@/lib/useRefresh';
import { EmptyState } from '@/ui/EmptyState';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import { ScreenTitle } from '@/ui/ScreenTitle';
import type { Exercise } from '@workout/domain';

const PAGE_SIZE = 50;

export function ExercisesListScreen() {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>();
  const [equipment, setEquipment] = useState<string>();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadExercises = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const [nextExercises, nextFavorites] = await Promise.all([
          exercisesClient.list(),
          exercisesClient.listFavorites().catch(() => [] as string[]),
        ]);

        if (shouldUpdate()) {
          setExercises(
            nextExercises
              .slice()
              .sort((left, right) => left.name.localeCompare(right.name)),
          );
          setFavorites(new Set(nextFavorites));
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('exercises.loadError'),
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

      void loadExercises(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadExercises]),
  );

  const facets = useMemo(() => buildExerciseFacets(exercises), [exercises]);

  const filtered = useMemo(() => {
    const base = filterExercises(exercises, { query, category, equipment });
    return favoritesOnly
      ? base.filter((exercise) => favorites.has(exercise.id))
      : base;
  }, [exercises, query, category, equipment, favoritesOnly, favorites]);

  // Reset paging whenever the filters narrow/expand the result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category, equipment, favoritesOnly]);

  const toggle = (
    current: string | undefined,
    value: string,
    set: (next: string | undefined) => void,
  ) => set(current === value ? undefined : value);

  const toggleFavorite = (exerciseId: string) => {
    const isFavorite = favorites.has(exerciseId);

    // Optimistic update; revert if the request fails.
    setFavorites((current) => {
      const next = new Set(current);
      if (isFavorite) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });

    const request = isFavorite
      ? exercisesClient.removeFavorite(exerciseId)
      : exercisesClient.addFavorite(exerciseId);

    void request.catch(() => {
      setFavorites((current) => {
        const next = new Set(current);
        if (isFavorite) {
          next.add(exerciseId);
        } else {
          next.delete(exerciseId);
        }
        return next;
      });
    });
  };

  const visible = filtered.slice(0, visibleCount);
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
      <ScreenTitle title={t('nav.exercises')} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('exercises.searchPlaceholder')}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setFavoritesOnly((value) => !value)}
        style={[styles.chip, favoritesOnly ? styles.chipActive : null, styles.favChip]}
      >
        <Text
          style={[styles.chipText, favoritesOnly ? styles.chipTextActive : null]}
        >
          {`${favoritesOnly ? '★' : '☆'} ${t('exercises.favorites')}`}
        </Text>
      </Pressable>
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
        <Text style={styles.meta}>{t('exercises.loading')}</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage && filtered.length > 0 ? (
        <Text style={styles.meta}>
          {t('exercises.count', { count: filtered.length })}
          {hiddenCount > 0 ? t('exercises.showing', { shown: visible.length }) : ''}
        </Text>
      ) : null}
      {!isLoading && !errorMessage && filtered.length === 0 ? (
        <EmptyState
          icon={favoritesOnly ? 'star-outline' : 'search-outline'}
          title={favoritesOnly ? t('exercises.emptyFavoritesTitle') : t('exercises.emptyMatchesTitle')}
          subtitle={
            favoritesOnly
              ? t('exercises.emptyFavoritesSubtitle')
              : t('exercises.emptyMatchesSubtitle')
          }
        />
      ) : null}
      <View style={styles.list}>
        {visible.map((exercise) => (
          <View key={exercise.id} style={styles.cardRow}>
            <Link href={`/exercises/${exercise.id}`} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  styles.cardFlex,
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
            <Pressable
              onPress={() => toggleFavorite(exercise.id)}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.starButton}
            >
              <Text style={styles.star}>
                {favorites.has(exercise.id) ? '★' : '☆'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {hiddenCount > 0 ? (
        <Pressable
          onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
          style={({ pressed }) => [
            styles.loadMore,
            pressed ? styles.cardPressed : null,
          ]}
        >
          <Text style={styles.loadMoreText}>
            {t('exercises.loadMore', { count: hiddenCount })}
          </Text>
        </Pressable>
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  card: {
    flex: 1,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  cardFlex: {
    flex: 1,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  starButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  star: {
    color: colors.primary,
    fontSize: 24,
  },
  favChip: {
    alignSelf: 'flex-start',
  },
  loadMore: {
    ...commonStyles.secondaryButton,
    alignSelf: 'center',
  },
  loadMoreText: {
    ...commonStyles.secondaryButtonText,
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
