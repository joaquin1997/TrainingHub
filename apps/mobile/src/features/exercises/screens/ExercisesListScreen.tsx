import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import {
  buildExerciseFacets,
  filterExercises,
} from '@/features/exercises/utils/exerciseFilters';
import { CustomExerciseModal } from '@/features/exercises/components/CustomExerciseModal';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { useRefresh } from '@/lib/useRefresh';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, fonts, spacing, typeScale, useTheme } from '@/ui/theme';
import { SkeletonRowList } from '@/ui/Skeleton';
import { ListRow } from '@/ui/ListRow';
import type { Exercise } from '@workout/domain';

const PAGE_SIZE = 50;

export function ExercisesListScreen() {
  useTheme();
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
  const [isCreating, setIsCreating] = useState(false);

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

  // The new exercise is put in view: filters cleared, searched by name (0020).
  const handleCreated = (created: Exercise) => {
    setExercises((current) =>
      [...current.filter((exercise) => exercise.id !== created.id), created].sort(
        (left, right) => left.name.localeCompare(right.name),
      ),
    );
    setFavoritesOnly(false);
    setCategory(undefined);
    setEquipment(undefined);
    setQuery(created.name);
  };

  const hasFilters =
    favoritesOnly || query.trim() !== '' || category !== undefined || equipment !== undefined;
  const clearFilters = () => {
    setFavoritesOnly(false);
    setQuery('');
    setCategory(undefined);
    setEquipment(undefined);
  };

  const visible = filtered.slice(0, visibleCount);
  const hiddenCount = filtered.length - visible.length;
  const { isRefreshing, onRefresh } = useRefresh(loadExercises);
  const showLoading = isLoading && exercises.length === 0;

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle
          title={t('nav.exercises')}
          action={{
            label: t('exercises.newExercise'),
            icon: 'add',
            onPress: () => setIsCreating(true),
          }}
        />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            keyboardAppearance="dark"
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
          style={styles.chipScroller}
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
            style={styles.chipScroller}
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
        {/* First load only: the shape of the rows to come (spec 0034 FR-15). */}
        {showLoading && !errorMessage ? <SkeletonRowList /> : null}
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
            // Back to the whole catalog (spec 0034 FR-14).
            actionLabel={hasFilters ? t('exercises.clearFilters') : undefined}
            onAction={hasFilters ? clearFilters : undefined}
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
              <ListRow
                key={exercise.id}
                variant="card"
                title={exercise.name}
                subtitle={details.length > 0 ? details.join(' · ') : undefined}
                leading={<ExerciseThumb imageUrl={exercise.imageUrl} />}
                onPress={() => router.push(`/exercises/${exercise.id}`)}
                trailing={
                  <Pressable
                    onPress={() => toggleFavorite(exercise.id)}
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
                }
              />
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
      <CustomExerciseModal
        visible={isCreating}
        initialName={query.trim()}
        onClose={() => setIsCreating(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

const styles = createStyles(() => ({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  centered: {
    alignSelf: 'center',
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
    ...typeScale.body,
  },
  // A short list must not stretch the chip rows (react-native-web grows scroll views).
  chipScroller: {
    flexGrow: 0,
  },
  chipRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  facetLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  list: {
    gap: spacing.sm,
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
