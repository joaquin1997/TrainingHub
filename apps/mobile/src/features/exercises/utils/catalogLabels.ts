import type { TFunction } from 'i18next';

/**
 * Catalog values in the app's language (spec 0044 FR-9). The catalog stores
 * fixed English values ("Legs", "none (bodyweight exercise)", "lower back");
 * each maps to an i18n key. An unknown value — from an older catalog or a
 * custom exercise — is shown as stored.
 */
const CATEGORY_KEYS: Record<string, string> = {
  Chest: 'chest',
  Back: 'back',
  Shoulders: 'shoulders',
  Arms: 'arms',
  Legs: 'legs',
  Calves: 'calves',
  Abs: 'abs',
  Cardio: 'cardio',
};

const EQUIPMENT_KEYS: Record<string, string> = {
  Barbell: 'barbell',
  Dumbbell: 'dumbbell',
  Kettlebell: 'kettlebell',
  'SZ-Bar': 'ezBar',
  'Trap bar': 'trapBar',
  Machine: 'machine',
  'Smith machine': 'smithMachine',
  Cable: 'cable',
  'Pull-up bar': 'pullUpBar',
  'Dip station': 'dipStation',
  Bench: 'bench',
  'Incline bench': 'inclineBench',
  'none (bodyweight exercise)': 'bodyweight',
  'Resistance band': 'band',
  'Medicine ball': 'medicineBall',
  'Swiss Ball': 'swissBall',
  'Ab wheel': 'abWheel',
  Landmine: 'landmine',
  Plate: 'plate',
  'Cardio machine': 'cardioMachine',
  'Jump rope': 'jumpRope',
  'Gym mat': 'gymMat',
};

const MUSCLE_KEYS: Record<string, string> = {
  abs: 'abs',
  biceps: 'biceps',
  brachialis: 'brachialis',
  calves: 'calves',
  chest: 'chest',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'lats',
  'obliquus externus abdominis': 'obliques',
  quads: 'quads',
  'serratus anterior': 'serratus',
  shoulders: 'shoulders',
  soleus: 'soleus',
  trapezius: 'trapezius',
  triceps: 'triceps',
  forearms: 'forearms',
  'lower back': 'lowerBack',
  adductors: 'adductors',
  abductors: 'abductors',
};

function label(group: string, keys: Record<string, string>, value: string, t: TFunction) {
  const key = keys[value];
  return key ? t(`catalog.${group}.${key}`) : value;
}

export const categoryLabel = (value: string, t: TFunction) =>
  label('category', CATEGORY_KEYS, value, t);
export const equipmentLabel = (value: string, t: TFunction) =>
  label('equipment', EQUIPMENT_KEYS, value, t);
export const muscleLabel = (value: string, t: TFunction) => label('muscle', MUSCLE_KEYS, value, t);
