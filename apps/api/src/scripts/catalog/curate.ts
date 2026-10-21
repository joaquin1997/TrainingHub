import { imageUrlFor } from '../matchImages.js';
import type { CatalogEntry } from './vocabulary.js';

/**
 * The plan of applying the reviewed catalog (spec 0044 FR-5..FR-8), worked out
 * from what the database holds. Pure: the script reads, this decides, the
 * script writes and keeps the run file for undo.
 */

/** The stored fields a reviewed exercise is made of. */
export interface CuratedFields {
  name: string;
  nameEs: string;
  nameEn: string;
  aliases: string[];
  category: string;
  equipment: string[];
  loadingKind: string | null;
  trackingType: string;
  isUnilateral: boolean;
  imageUrl: string | null;
  primary: string[];
  secondary: string[];
}

/** A reviewed exercise already in the database (source `curated`). */
export interface StoredCurated extends CuratedFields {
  sourceId: string;
  deletedAt: string | null;
}

/** Any other exercise: the old import (wger) or a custom one. */
export interface StoredOld {
  publicId: string;
  name: string;
  source: string;
  isSystemDefined: boolean;
  deletedAt: string | null;
  trackingType: string;
  trackingTypeSetBy: string;
}

export interface StoredUsage {
  workoutExercises: Array<{ id: string; exercisePublicId: string }>;
  routineExercises: Array<{ id: string; exercisePublicId: string; exerciseName: string }>;
  favorites: Array<{ id: string; userId: string; exercisePublicId: string }>;
  /** Users who already have each reviewed exercise as a favourite, by slug. */
  curatedFavorites: Array<{ userId: string; slug: string }>;
}

export interface CarryOverStep {
  from: string;
  fromName: string;
  to: string;
  workoutExerciseIds: string[];
  routineExercises: Array<{ id: string; exerciseName: string }>;
  /** Favourites moved to the reviewed exercise. */
  favoritesMoved: string[];
  /** Favourites dropped because the person already has the reviewed one. */
  favoritesDropped: Array<{ id: string; userId: string }>;
}

export interface CuratePlan {
  newMuscles: string[];
  creates: string[];
  updates: Array<{ slug: string; before: Partial<CuratedFields>; after: Partial<CuratedFields> }>;
  /** Reviewed exercises retired earlier and now back in the catalog. */
  restores: string[];
  unchanged: number;
  carryOver: CarryOverStep[];
  /** Map lines that cannot be applied: never guessed (EF-3). */
  ignoredMap: Array<{ from: string; to: string; reason: string }>;
  /** FR-7: a type set by hand that the reviewed exercise does not keep. */
  trackingTypeNotes: Array<{ from: string; fromName: string; was: string; to: string; becomes: string }>;
  retire: Array<{ publicId: string; name: string; source: string }>;
}

/** What a catalog entry stores (spec 0044). */
export function curatedFields(entry: CatalogEntry): CuratedFields {
  return {
    name: entry.es,
    nameEs: entry.es,
    nameEn: entry.en,
    aliases: [...entry.aliases],
    category: entry.category,
    equipment: [...entry.equipment],
    loadingKind: entry.loadingKind ?? null,
    trackingType: entry.trackingType,
    isUnilateral: entry.unilateral,
    imageUrl: entry.image ? imageUrlFor(`${entry.image}/0.jpg`) : null,
    primary: [...entry.primary],
    secondary: [...entry.secondary],
  };
}

const FIELD_KEYS: Array<keyof CuratedFields> = [
  'name',
  'nameEs',
  'nameEn',
  'aliases',
  'category',
  'equipment',
  'loadingKind',
  'trackingType',
  'isUnilateral',
  'imageUrl',
  'primary',
  'secondary',
];

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function planCurate(input: {
  catalog: CatalogEntry[];
  muscles: string[];
  curated: StoredCurated[];
  old: StoredOld[];
  usage: StoredUsage;
  carryOverMap: Record<string, string>;
}): CuratePlan {
  const { catalog, curated, old, usage, carryOverMap } = input;
  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const storedBySlug = new Map(curated.map((row) => [row.sourceId, row]));
  const oldById = new Map(old.map((row) => [row.publicId, row]));
  const knownMuscles = new Set(input.muscles);

  const newMuscles = [
    ...new Set(catalog.flatMap((entry) => [...entry.primary, ...entry.secondary])),
  ].filter((muscle) => !knownMuscles.has(muscle));

  const creates: string[] = [];
  const updates: CuratePlan['updates'] = [];
  const restores: string[] = [];
  let unchanged = 0;
  for (const entry of catalog) {
    const stored = storedBySlug.get(entry.slug);
    if (!stored) {
      creates.push(entry.slug);
      continue;
    }
    const wanted = curatedFields(entry);
    const before: Partial<CuratedFields> = {};
    const after: Partial<CuratedFields> = {};
    for (const key of FIELD_KEYS) {
      if (!same(stored[key], wanted[key])) {
        (before as Record<string, unknown>)[key] = stored[key];
        (after as Record<string, unknown>)[key] = wanted[key];
      }
    }
    if (stored.deletedAt) {
      restores.push(entry.slug);
    }
    if (Object.keys(after).length > 0) {
      updates.push({ slug: entry.slug, before, after });
    } else if (!stored.deletedAt) {
      unchanged += 1;
    }
  }

  const carryOver: CarryOverStep[] = [];
  const ignoredMap: CuratePlan['ignoredMap'] = [];
  const trackingTypeNotes: CuratePlan['trackingTypeNotes'] = [];
  const favoured = new Set(usage.curatedFavorites.map((row) => `${row.userId}:${row.slug}`));
  for (const [from, to] of Object.entries(carryOverMap)) {
    const source = oldById.get(from);
    const entry = bySlug.get(to);
    if (!source) {
      ignoredMap.push({ from, to, reason: 'old exercise not in this database' });
      continue;
    }
    if (!entry) {
      ignoredMap.push({ from, to, reason: 'slug not in the reviewed catalog' });
      continue;
    }

    const step: CarryOverStep = {
      from,
      fromName: source.name,
      to,
      workoutExerciseIds: usage.workoutExercises
        .filter((row) => row.exercisePublicId === from)
        .map((row) => row.id),
      routineExercises: usage.routineExercises
        .filter((row) => row.exercisePublicId === from)
        .map((row) => ({ id: row.id, exerciseName: row.exerciseName })),
      favoritesMoved: [],
      favoritesDropped: [],
    };
    for (const favorite of usage.favorites.filter((row) => row.exercisePublicId === from)) {
      const key = `${favorite.userId}:${to}`;
      if (favoured.has(key)) {
        step.favoritesDropped.push({ id: favorite.id, userId: favorite.userId });
      } else {
        favoured.add(key);
        step.favoritesMoved.push(favorite.id);
      }
    }
    if (
      step.workoutExerciseIds.length +
        step.routineExercises.length +
        step.favoritesMoved.length +
        step.favoritesDropped.length >
      0
    ) {
      carryOver.push(step);
    }
    if (source.trackingTypeSetBy === 'person' && source.trackingType !== entry.trackingType) {
      trackingTypeNotes.push({
        from,
        fromName: source.name,
        was: source.trackingType,
        to,
        becomes: entry.trackingType,
      });
    }
  }

  const merged = new Set(Object.keys(carryOverMap).filter((id) => oldById.has(id)));
  const retire = old
    .filter(
      (row) =>
        !row.deletedAt &&
        ((row.source === 'wger' && row.isSystemDefined) ||
          (row.source === 'custom' && merged.has(row.publicId) && bySlug.has(carryOverMap[row.publicId]!))),
    )
    .map((row) => ({ publicId: row.publicId, name: row.name, source: row.source }));

  return {
    newMuscles,
    creates,
    updates,
    restores,
    unchanged,
    carryOver,
    ignoredMap,
    trackingTypeNotes,
    retire,
  };
}

/** Whether applying the plan would change anything (FR-8: a second run does not). */
export function isEmptyPlan(plan: CuratePlan): boolean {
  return (
    plan.newMuscles.length +
      plan.creates.length +
      plan.updates.length +
      plan.restores.length +
      plan.carryOver.length +
      plan.retire.length ===
    0
  );
}

/** Reviewed exercises that left the catalog file are retired too (FR-8). */
export function droppedCurated(catalog: CatalogEntry[], curated: StoredCurated[]): string[] {
  const slugs = new Set(catalog.map((entry) => entry.slug));
  return curated.filter((row) => !row.deletedAt && !slugs.has(row.sourceId)).map((row) => row.sourceId);
}
