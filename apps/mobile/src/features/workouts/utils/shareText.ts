import { formatDayHeading, formatDuration } from '@/lib/format';
import { formatWeightValue } from '@/lib/weight';
import type { WeightUnit, WorkoutSetType } from '@workout/domain';

export interface ShareSet {
  weightKg?: number | null;
  reps?: number | null;
  type: WorkoutSetType;
  performed: boolean;
}

export interface ShareWorkoutInput {
  /** Routine name when known (a saved session does not carry it). */
  title?: string;
  when: string;
  durationSeconds: number | null;
  volumeKg: number;
  unit: WeightUnit;
  language: string;
  exercises: { name: string; sets: ShareSet[] }[];
  notes?: string;
  t: (key: string) => string;
}

/**
 * Plain text of a finished workout for the share sheet (spec 0028): date,
 * routine, duration, volume and each exercise's performed sets, in the app's
 * language and the person's weight unit. Unticked sets are left out.
 * TODO(0023): mark the records beaten once records are exposed (FR-3).
 */
export function formatWorkoutShareText(input: ShareWorkoutInput): string {
  const { t, unit } = input;
  const stats = [
    input.durationSeconds === null
      ? null
      : `${t('workouts.share.duration')} ${formatDuration(input.durationSeconds)}`,
    `${t('workouts.share.volume')} ${formatWeightValue(input.volumeKg, unit)} ${unit}`,
  ].filter(Boolean);

  const lines: string[] = [];
  if (input.title) lines.push(input.title);
  lines.push(formatDayHeading(input.when, input.language), stats.join(' · '));

  for (const exercise of input.exercises) {
    const done = exercise.sets.filter((set) => set.performed);
    if (done.length === 0) continue;
    lines.push('', exercise.name);
    done.forEach((set, index) => {
      const label = set.type === 'normal' ? '' : ` (${t(`workouts.setType.${set.type}`)})`;
      lines.push(
        `${index + 1}. ${formatWeightValue(set.weightKg, unit)} ${unit} × ${set.reps ?? '–'}${label}`,
      );
    });
  }

  if (input.notes) lines.push('', `${t('workouts.share.notes')}: ${input.notes}`);
  return lines.join('\n');
}
