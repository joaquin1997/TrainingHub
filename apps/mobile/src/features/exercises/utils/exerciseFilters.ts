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

/** Filters by name query, category and equipment (each optional, AND-combined). */
export function filterExercises(
  exercises: Exercise[],
  filter: ExerciseFilter,
): Exercise[] {
  const normalizedQuery = filter.query.trim().toLowerCase();

  return exercises.filter((exercise) => {
    if (
      normalizedQuery &&
      !exercise.name.toLowerCase().includes(normalizedQuery)
    ) {
      return false;
    }

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
