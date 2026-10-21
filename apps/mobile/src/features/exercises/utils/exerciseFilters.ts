import type { Exercise } from '@workout/domain';

export interface ExerciseFilter {
  query: string;
  category?: string;
  equipment?: string;
}

export interface ExerciseFacets {
  categories: string[];
  equipment: string[];
}

/** Distinct, sorted category and equipment values present in the catalog. */
export function buildExerciseFacets(exercises: Exercise[]): ExerciseFacets {
  const categories = new Set<string>();
  const equipment = new Set<string>();

  for (const exercise of exercises) {
    if (exercise.category?.trim()) {
      categories.add(exercise.category);
    }
    for (const item of exercise.equipment ?? []) {
      if (item.trim()) {
        equipment.add(item);
      }
    }
  }

  const sorted = (values: Set<string>) =>
    [...values].sort((left, right) => left.localeCompare(right));

  return { categories: sorted(categories), equipment: sorted(equipment) };
}

/** Lower case, no accents, single spaces: how names are searched (spec 0044 FR-10). */
export function normaliseSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * How well an exercise answers a search, lower is better (spec 0044 FR-3):
 * its name starts with the query (0), a word of its name does (1), its name
 * holds every word of the query (2), another name of it does (3). Null when
 * nothing matches.
 */
export function searchRank(exercise: Pick<Exercise, 'name' | 'aliases'>, query: string): number | null {
  const wanted = normaliseSearch(query);
  if (!wanted) {
    return 0;
  }
  const words = wanted.split(' ');
  const holdsAll = (text: string) => words.every((word) => text.includes(word));

  const name = normaliseSearch(exercise.name);
  if (name.startsWith(wanted)) {
    return 0;
  }
  if (name.split(' ').some((word) => word.startsWith(words[0]!)) && holdsAll(name)) {
    return 1;
  }
  if (holdsAll(name)) {
    return 2;
  }
  return (exercise.aliases ?? []).some((alias) => holdsAll(normaliseSearch(alias))) ? 3 : null;
}

/**
 * The exercises that answer `query`, best first, then shorter names (the
 * plain exercise before its variants), then alphabetically. Without a query,
 * the list as it is.
 */
export function searchExercises<T extends Pick<Exercise, 'name' | 'aliases'>>(
  exercises: T[],
  query: string,
): T[] {
  if (!normaliseSearch(query)) {
    return exercises;
  }
  return exercises
    .map((exercise) => ({ exercise, rank: searchRank(exercise, query) }))
    .filter((item): item is { exercise: T; rank: number } => item.rank !== null)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.exercise.name.length - right.exercise.name.length ||
        left.exercise.name.localeCompare(right.exercise.name),
    )
    .map((item) => item.exercise);
}

/** Filters by search, category and equipment (each optional, AND-combined). */
export function filterExercises(
  exercises: Exercise[],
  filter: ExerciseFilter,
): Exercise[] {
  return searchExercises(exercises, filter.query).filter((exercise) => {
    if (filter.category && exercise.category !== filter.category) {
      return false;
    }

    if (
      filter.equipment &&
      !(exercise.equipment ?? []).includes(filter.equipment)
    ) {
      return false;
    }

    return true;
  });
}
