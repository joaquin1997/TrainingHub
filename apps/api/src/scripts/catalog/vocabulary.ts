/**
 * The closed values the reviewed catalog may use (spec 0044 FR-4). Stored as
 * these strings, as the old catalog did, so filters and custom exercises keep
 * working; the app shows them in its language.
 */

/** Body-part categories, as already stored (glutes count as legs). */
export const CATALOG_CATEGORIES = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Calves',
  'Abs',
  'Cardio',
] as const;

/** Muscle group names; the last four are new with spec 0044. */
export const CATALOG_MUSCLES = [
  'abs',
  'biceps',
  'brachialis',
  'calves',
  'chest',
  'glutes',
  'hamstrings',
  'lats',
  'obliquus externus abdominis',
  'quads',
  'serratus anterior',
  'shoulders',
  'soleus',
  'trapezius',
  'triceps',
  'forearms',
  'lower back',
  'adductors',
  'abductors',
] as const;

export const CATALOG_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'SZ-Bar',
  'Trap bar',
  'Machine',
  'Smith machine',
  'Cable',
  'Pull-up bar',
  'Dip station',
  'Bench',
  'Incline bench',
  'none (bodyweight exercise)',
  'Resistance band',
  'Medicine ball',
  'Swiss Ball',
  'Ab wheel',
  'Landmine',
  'Plate',
  'Cardio machine',
  'Jump rope',
  /** Sleds, chains, stones, kegs… (free-exercise-db "other"). */
  'Other',
] as const;

export const CATALOG_TRACKING_TYPES = [
  'weight_reps',
  'reps',
  'duration',
  'weight_duration',
  'distance_duration',
] as const;

export const CATALOG_LOADING_KINDS = ['barbell', 'dumbbell', 'machine'] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];
export type CatalogMuscle = (typeof CATALOG_MUSCLES)[number];
export type CatalogEquipment = (typeof CATALOG_EQUIPMENT)[number];
export type CatalogTrackingType = (typeof CATALOG_TRACKING_TYPES)[number];
export type CatalogLoadingKind = (typeof CATALOG_LOADING_KINDS)[number];

/** One reviewed catalog exercise as written in `data/catalog/*.json`. */
export interface CatalogEntry {
  /** Stable id, kebab-case English; never reused for another movement. */
  slug: string;
  es: string;
  en: string;
  /** Other names people search by, in either language. */
  aliases: string[];
  category: CatalogCategory;
  primary: CatalogMuscle[];
  secondary: CatalogMuscle[];
  equipment: CatalogEquipment[];
  /** Required when the tracking type records weight; absent otherwise. */
  loadingKind?: CatalogLoadingKind;
  trackingType: CatalogTrackingType;
  unilateral: boolean;
  /** free-exercise-db id, for the picture (spec 0026); absent when none fits. */
  image?: string;
}
