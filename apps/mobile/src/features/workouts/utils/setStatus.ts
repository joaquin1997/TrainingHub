import type { WorkoutSetDraft } from '@/features/workouts/state/workoutDraftStore';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * What a set row's one status area shows (spec 0034 FR-19), by priority:
 * a done set that earned a record shows the record; a done set, done; the
 * set to do now, up next — also a generated warm-up, so the outline never
 * goes missing (spec 0040 FR-2); an undone generated warm-up (0031), its
 * mark; otherwise nothing.
 */
export type SetStatus = 'record' | 'done' | 'generatedWarmup' | 'upNext' | 'none';

export function setStatus(
  set: Pick<WorkoutSetDraft, 'done' | 'generatedWarmup'>,
  { hasRecord, isUpNext }: { hasRecord: boolean; isUpNext: boolean },
): SetStatus {
  if (set.done) {
    return hasRecord ? 'record' : 'done';
  }
  if (isUpNext) {
    return 'upNext';
  }
  return set.generatedWarmup ? 'generatedWarmup' : 'none';
}

/** The status area ticks and unticks: it is checked exactly when the set is done. */
export function isStatusChecked(status: SetStatus): boolean {
  return status === 'record' || status === 'done';
}

/** The status in words, for screen readers (FR-17: never colour alone). */
export function setStatusLabel(status: SetStatus, t: Translate): string {
  switch (status) {
    case 'record':
      return t('workouts.setStatus.record');
    case 'done':
      return t('workouts.setStatus.done');
    case 'generatedWarmup':
      return t('workouts.setStatus.generatedWarmup');
    case 'upNext':
      return t('workouts.setStatus.upNext');
    default:
      return t('workouts.setStatus.none');
  }
}
