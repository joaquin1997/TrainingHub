import { describeRecord } from '@/features/progress/utils/recordLabels';
import { formatDayHeading, formatDuration } from '@/lib/format';
import { formatSetValues, sideLabels } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import type { SessionRecord, WeightUnit, WorkoutSetType } from '@workout/domain';

export interface ShareSet {
  weightKg?: number | null;
  reps?: number | null;
  /** A unilateral set reads "20 kg × 10 L / 8 R" (spec 0022). */
  repsLeft?: number | null;
  repsRight?: number | null;
  /** Time and distance sets read "1:00" or "500 m · 1:45" (spec 0021). */
  durationSeconds?: number | null;
  distanceMeters?: number | null;
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
  /** Records the workout beat (spec 0023), already described for display. */
  records?: { exerciseName: string; title: string; value: string }[];
  t: (key: string) => string;
}

/** The records a workout beat, described for {@link formatWorkoutShareText}. */
export function shareRecords(
  records: SessionRecord[],
  unit: WeightUnit,
  t: Parameters<typeof describeRecord>[2],
): NonNullable<ShareWorkoutInput['records']> {
  return records.map((record) => {
    const { title, value } = describeRecord(record, unit, t);
    return { exerciseName: record.exerciseName, title, value };
  });
}

/**
 * Plain text of a finished workout for the share sheet (spec 0028): date,
 * routine, duration, volume and each exercise's performed sets, in the app's
 * language and the person's weight unit. Unticked sets are left out. Records
 * beaten are listed when known (FR-3).
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
        `${index + 1}. ${formatSetValues(set, unit, sideLabels(t))}${label}`,
      );
    });
  }

  if (input.records && input.records.length > 0) {
    lines.push('', t('workouts.share.records'));
    for (const record of input.records) {
      lines.push(`${record.exerciseName}: ${record.title} · ${record.value}`);
    }
  }

  if (input.notes) lines.push('', `${t('workouts.share.notes')}: ${input.notes}`);
  return lines.join('\n');
}
