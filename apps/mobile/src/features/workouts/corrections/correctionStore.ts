import type { WorkoutCorrectionDraft } from './correctionDraft';
export interface CorrectionEntry {
  draft: WorkoutCorrectionDraft;
  saving: boolean;
  error?: 'invalid' | 'noPerformed' | 'unsupported' | 'conflict' | 'unavailable' | 'inaccessible';
  submission?: { fingerprint: string; mutationId: string };
}
const drafts = new Map<string, CorrectionEntry>();
const listeners = new Set<() => void>();
const key = (ownerId: string, workoutId: string) => JSON.stringify([ownerId, workoutId]);
/** Unsaved drafts survive same-owner reauthentication, never cross-account rendering. */
export const correctionStore = {
  get(ownerId: string, workoutId: string) { return drafts.get(key(ownerId, workoutId)) ?? null; },
  set(ownerId: string, workoutId: string, entry: CorrectionEntry) {
    drafts.set(key(ownerId, workoutId), entry); listeners.forEach((listener) => listener());
  },
  remove(ownerId: string, workoutId: string) { drafts.delete(key(ownerId, workoutId)); listeners.forEach((listener) => listener()); },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
