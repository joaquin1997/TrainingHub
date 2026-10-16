import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { useRefresh } from '@/lib/useRefresh';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, spacing } from '@/ui/theme';
import type { Exercise } from '@workout/domain';

const PAGE_SIZE = 50;

export function ExercisesListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle title={t('nav.exercises')} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercises.searchPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip
          icon={favoritesOnly ? 'star' : 'star-outline'}
          label={t('exercises.favorites')}
          selected={favoritesOnly}
          onPress={() => setFavoritesOnly((value) => !value)}
        />
        {facets.categories.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => toggle(category, value, setCategory)}
          />
        ))}
      </ScrollView>
      {facets.equipment.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <View style={styles.facetLabel}>
            <Ionicons name="options-outline" size={14} color={colors.textMuted} />
            <Text style={styles.sectionLabel}>{t('exercises.equipmentLabel')}</Text>
          </View>
          {facets.equipment.map((value) => (
            <Chip
              key={value}
              label={value}
              size="sm"
              selected={equipment === value}
              onPress={() => toggle(equipment, value, setEquipment)}
            />
          ))}
        </ScrollView>
      ) : null}
      {showLoading ? <StateView kind="loading" message={t('exercises.loading')} /> : null}
      {errorMessage ? (
        <StateView
          kind="error"
          message={errorMessage}
          actionLabel={t('common.retry')}
          onAction={() => void onRefresh()}
        />
      ) : null}
      {!isLoading && !errorMessage && filtered.length > 0 ? (
        <Text style={styles.sectionLabel}>
          {t('exercises.count', { count: filtered.length })}
          {hiddenCount > 0 ? t('exercises.showing', { shown: visible.length }) : ''}
        </Text>
      ) : null}
      {!isLoading && !errorMessage && filtered.length === 0 ? (
        <StateView
          kind="empty"
          icon={favoritesOnly ? 'star-outline' : 'search-outline'}
          title={favoritesOnly ? t('exercises.emptyFavoritesTitle') : t('exercises.emptyMatchesTitle')}
          message={
            favoritesOnly
              ? t('exercises.emptyFavoritesSubtitle')
              : t('exercises.emptyMatchesSubtitle')
          }
        />
      ) : null}
      <View style={styles.list}>
        {visible.map((exercise) => {
          const isFavorite = favorites.has(exercise.id);
          const details = [
            exercise.primaryMuscleGroups?.join(', '),
            exercise.equipment?.join(', '),
          ].filter(Boolean);

          return (
            <View key={exercise.id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/exercises/${exercise.id}`)}
                style={({ pressed }) => [styles.rowMain, pressed ? styles.pressed : null]}
              >
                <ExerciseThumb imageUrl={exercise.imageUrl} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{exercise.name}</Text>
                  {details.length > 0 ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {details.join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => toggleFavorite(exercise.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavorite }}
                accessibilityLabel={t('exercises.favorites')}
                style={styles.starButton}
              >
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={22}
                  color={isFavorite ? colors.primary : colors.textSubtle}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
      {hiddenCount > 0 ? (
        <Button
          label={t('exercises.loadMore', { count: hiddenCount })}
          variant="secondary"
          style={styles.centered}
          onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
        />
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
  centered: {
    alignSelf: 'center',
  },
  pressed: {
    ...commonStyles.pressed,
  },
  search: {
    ...commonStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    color: colors.text,
    fontSize: 16,
  },
  chipRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  facetLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: spacing.xs,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 21,
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    ...commonStyles.meta,
    fontSize: 13,
  },
});
