/**
 * The single rule for which logged sets count as work (spec 0013). Progress,
 * "last time" and the `performed` flag on saved sets all go through these
 * helpers, so the rule cannot drift between them.
 */

type SetCompletion = { completedAt?: Date | string | null };
type SetKind = { type?: string | null; isWarmup?: boolean | null };

/**
 * A legacy session was saved before sets could be marked done: none of its
 * sets carries a completion time. All of its sets count as performed.
 */
export function isLegacySession(sets: Iterable<SetCompletion>): boolean {
  for (const set of sets) {
    if (set.completedAt) {
      return false;
    }
  }
  return true;
}

/** A set counts as work when it was marked done, or its session is legacy. */
export function isPerformedSet(set: SetCompletion, legacy: boolean): boolean {
  return legacy || Boolean(set.completedAt);
}

/** Warmups count toward volume, never toward records or estimated 1RM. */
export function isWarmupSet(set: SetKind): boolean {
  return set.type === 'warmup' || set.isWarmup === true;
}

export type LastPerformanceCandidate<TSet extends SetCompletion> = {
  performedAt: string;
  /** Whether any set of the candidate's whole session was marked done. */
  sessionHasCompletedSet: boolean;
  sets: TSet[];
};

/**
 * Picks "last time" from candidates ordered most recent first: the first one
 * with performed sets, keeping only those sets. Returns null when none has any.
 */
export function pickLastPerformance<TSet extends SetCompletion>(
  candidates: LastPerformanceCandidate<TSet>[],
): { performedAt: string; sets: TSet[] } | null {
  for (const candidate of candidates) {
    const legacy = !candidate.sessionHasCompletedSet;
    const sets = candidate.sets.filter((set) => isPerformedSet(set, legacy));

    if (sets.length > 0) {
      return { performedAt: candidate.performedAt, sets };
    }
  }

  return null;
}
