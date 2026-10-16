import type { ExerciseTrackingType, WeightUnit, WorkoutSet } from '@workout/domain';

import { formatDuration } from './format';
import { formatWeightValue } from './weight';

/**
 * What an exercise's sets record (spec 0021). Time is whole seconds and
 * distance is metres; neither depends on the weight unit.
 */
export type SetValueField = 'weight' | 'reps' | 'duration' | 'distance';

export const TRACKING_TYPES: readonly ExerciseTrackingType[] = [
  'weight_reps',
  'reps',
  'duration',
  'weight_duration',
  'distance_duration',
];

const FIELDS: Record<ExerciseTrackingType, readonly SetValueField[]> = {
  weight_reps: ['weight', 'reps'],
  reps: ['reps'],
  duration: ['duration'],
  weight_duration: ['weight', 'duration'],
  distance_duration: ['distance', 'duration'],
};

/** The set fields of a tracking type, in column order; absent = weight & reps. */
export function trackingFields(type?: ExerciseTrackingType): readonly SetValueField[] {
  return (type && FIELDS[type]) || FIELDS.weight_reps;
}

export function tracksField(type: ExerciseTrackingType | undefined, field: SetValueField) {
  return trackingFields(type).includes(field);
}

/** Whether the record of this type is a time or a distance, not a weight (FR-6). */
export function isTimedOrDistance(type?: ExerciseTrackingType) {
  return tracksField(type, 'duration') || tracksField(type, 'distance');
}

/**
 * A typed time in whole seconds: "90" → 90, "1:30" → 90, "1:02:03" → 3723
 * (EF-2). Empty → undefined; anything else → null (invalid).
 */
export function parseDurationInput(text: string): number | null | undefined {
  const value = text.trim();
  if (value === '') {
    return undefined;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(':');
  if (parts.length > 3 || !parts.every((part) => /^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map(Number);
  // Every part after the first is minutes or seconds, so below 60.
  if (numbers.slice(1).some((part) => part >= 60)) {
    return null;
  }

  return numbers.reduce((total, part) => total * 60 + part, 0);
}

/** A typed distance in metres. Empty → undefined; not a number ≥ 0 → null. */
export function parseDistanceInput(text: string): number | null | undefined {
  const value = text.trim().replace(',', '.');
  if (value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Metres for display: "500 m" below a kilometre, "1.5 km" from there. */
export function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters * 10) / 10} m`;
  }

  return `${Math.round(meters / 10) / 100} km`;
}

type SetValues = Pick<WorkoutSet, 'reps' | 'weightKg' | 'durationSeconds' | 'distanceMeters'>;

/**
 * One line for a saved set, built from the values it holds rather than the
 * exercise's current type, so a later type change never alters history
 * (EF-1). A set with no time or distance reads as before: "60 kg × 8".
 */
export function formatSetValues(set: SetValues, unit: WeightUnit) {
  const hasTime = set.durationSeconds !== undefined && set.durationSeconds !== null;
  const hasDistance = set.distanceMeters !== undefined && set.distanceMeters !== null;

  if (!hasTime && !hasDistance) {
    return `${formatWeightValue(set.weightKg, unit)} ${unit} × ${set.reps ?? '–'}`;
  }

  const parts: string[] = [];
  if (hasDistance) {
    parts.push(formatDistance(set.distanceMeters!));
  }
  if (set.weightKg !== undefined && set.weightKg !== null) {
    parts.push(`${formatWeightValue(set.weightKg, unit)} ${unit}`);
  }
  if (set.reps !== undefined && set.reps !== null) {
    parts.push(`× ${set.reps}`);
  }
  if (hasTime) {
    parts.push(formatDuration(set.durationSeconds!));
  }

  return parts.join(' · ');
}
