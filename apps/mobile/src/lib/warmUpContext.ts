import type { ExerciseLoadingKind, ExerciseWarmUpPreferences, WarmUpExerciseMetadata, WeightUnit } from '@workout/domain';
import type { WarmUpRampOptions } from './approachSets';
import { fromKg } from './weight';

export const DEFAULT_WARM_UP_PREFERENCES: ExerciseWarmUpPreferences = {
  loadingKind: null, approachSetCount: null, incrementKg: null,
};

export function isWarmUpPreferences(value: unknown): value is ExerciseWarmUpPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return (p.loadingKind === null || ['barbell', 'dumbbell', 'machine'].includes(p.loadingKind as string)) &&
    (p.approachSetCount === null || (typeof p.approachSetCount === 'number' && Number.isInteger(p.approachSetCount) && p.approachSetCount >= 1 && p.approachSetCount <= 5)) &&
    (p.incrementKg === null || (typeof p.incrementKg === 'number' && Number.isFinite(p.incrementKg) && p.incrementKg > 0));
}

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const names = (m: WarmUpExerciseMetadata) => [m.name ?? '', ...(m.aliases ?? [])].map(normalize).join(' ');

export function inferLoadingKind(metadata: WarmUpExerciseMetadata): ExerciseLoadingKind {
  if (metadata.loadingKind) return metadata.loadingKind;
  const infer = (s: string): ExerciseLoadingKind | undefined => {
    if (/\b(machine|maquina|cable|polea|pulley|smith)\b/.test(s)) return 'machine';
    if (/\b(dumbbells?|mancuernas?|kettlebells?|pesa rusa)\b/.test(s)) return 'dumbbell';
    if (/\b(barbell|barra|bar)\b/.test(s)) return 'barbell';
    return undefined;
  };
  return infer(names(metadata)) ?? infer(normalize((metadata.equipment ?? []).join(' '))) ?? 'machine';
}

// Catalog muscle names and category fallbacks normalize into primary groups.
const GROUPS: ReadonlyArray<readonly [string, RegExp, boolean]> = [
  ['quads', /^(quadriceps|quads|cuadriceps|cuadricep)$/, true],
  ['glutes', /^(glutes|gluteals|gluteos)$/, true],
  ['hamstrings', /^(hamstrings|isquiotibiales|femorales)$/, true],
  ['lats', /^(lats|latissimus dorsi|dorsales)$/, true],
  ['lowerBack', /^(lower back|erector spinae|lumbares)$/, true],
  ['back', /^(back|espalda|middle back|upper back)$/, true],
  ['chest', /^(chest|pectorals|pecho|pectorales)$/, true],
  ['legs', /^(legs|piernas|adductors|abductors|aductores|abductores)$/, true],
  ['arms', /^(arms|brazos)$/, false],
  ['biceps', /^(biceps|biceps brachii)$/, false],
  ['brachialis', /^brachialis$/, false],
  ['triceps', /^(triceps|triceps brachii)$/, false],
  ['shoulders', /^(shoulders|hombros|deltoids|deltoides)$/, false],
  ['calves', /^(calves|gemelos|pantorrillas)$/, false],
  ['soleus', /^(soleus|soleo)$/, false],
  ['serratus', /^(serratus anterior|serrato anterior)$/, false],
  ['abs', /^(abs|abdominals|abdominales|obliques|obliquus externus abdominis|core)$/, false],
  ['traps', /^(traps|trapezius|trapecio|trapecios)$/, false],
  ['forearms', /^(forearms|antebrazos)$/, false],
];
function muscleContext(m: WarmUpExerciseMetadata) {
  const primary = (m.primaryMuscleGroups ?? []).flatMap((name) => {
    const group = GROUPS.find(([, pattern]) => pattern.test(normalize(name)));
    return group ? [group] : [];
  });
  const fallback = GROUPS.find(([, pattern]) => pattern.test(normalize(m.category ?? '')));
  const groups = primary.length ? primary : fallback ? [fallback] : [];
  return { groups, primaryKnown: primary.length > 0, category: fallback?.[0], large: groups.length === 0 || groups.some(([, , large]) => large) };
}

export function resolveWarmUpContext(
  metadata: WarmUpExerciseMetadata,
  preceding: WarmUpExerciseMetadata[],
  unit: WeightUnit,
  preferences: ExerciseWarmUpPreferences = DEFAULT_WARM_UP_PREFERENCES,
): WarmUpRampOptions {
  const muscle = muscleContext(metadata);
  const previous = preceding.map(muscleContext);
  return {
    loadingKind: preferences.loadingKind ?? inferLoadingKind(metadata),
    isEzBar: /\b(ez|sz|z)\b/.test(`${names(metadata)} ${normalize((metadata.equipment ?? []).join(' '))}`),
    muscleSize: muscle.large ? 'large' : 'small',
    alreadyWorked: previous.some((earlier) => muscle.groups.some(([key]) => earlier.groups.some(([other]) => key === other)) ||
      ((!muscle.primaryKnown || !earlier.primaryKnown) && muscle.category !== undefined && muscle.category === earlier.category)),
    count: preferences.approachSetCount,
    increment: preferences.incrementKg === null ? undefined : fromKg(preferences.incrementKg, unit),
  };
}

export function warmUpMetadataOf(exercise: WarmUpExerciseMetadata): WarmUpExerciseMetadata {
  return { name: exercise.name, aliases: exercise.aliases, loadingKind: exercise.loadingKind,
    equipment: exercise.equipment, category: exercise.category, primaryMuscleGroups: exercise.primaryMuscleGroups };
}
