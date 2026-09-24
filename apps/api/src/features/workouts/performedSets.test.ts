import { describe, expect, it } from 'vitest';

import {
  isLegacySession,
  isPerformedSet,
  isWarmupSet,
  pickLastPerformance,
} from './performedSets.js';

const done = '2026-06-01T10:00:00.000Z';

describe('isLegacySession', () => {
  it('is legacy when no set was marked done', () => {
    expect(isLegacySession([{ completedAt: null }, {}])).toBe(true);
  });

  it('is not legacy when any set was marked done', () => {
    expect(isLegacySession([{ completedAt: null }, { completedAt: done }])).toBe(
      false,
    );
  });

  it('accepts Date completion times', () => {
    expect(isLegacySession([{ completedAt: new Date(done) }])).toBe(false);
  });
});

describe('isPerformedSet', () => {
  it('counts only sets marked done in a normal session', () => {
    expect(isPerformedSet({ completedAt: done }, false)).toBe(true);
    expect(isPerformedSet({ completedAt: null }, false)).toBe(false);
  });

  it('counts every set of a legacy session', () => {
    expect(isPerformedSet({ completedAt: null }, true)).toBe(true);
  });
});

describe('isWarmupSet', () => {
  it('recognises the warmup type and the older isWarmup flag', () => {
    expect(isWarmupSet({ type: 'warmup' })).toBe(true);
    expect(isWarmupSet({ type: 'normal', isWarmup: true })).toBe(true);
  });

  it('treats drop and failure sets as working sets', () => {
    expect(isWarmupSet({ type: 'drop' })).toBe(false);
    expect(isWarmupSet({ type: 'failure', isWarmup: false })).toBe(false);
  });
});

describe('pickLastPerformance', () => {
  it('keeps only the performed sets of the most recent candidate', () => {
    const picked = pickLastPerformance([
      {
        performedAt: '2026-06-02T10:00:00.000Z',
        sessionHasCompletedSet: true,
        sets: [
          { order: 1, completedAt: done },
          { order: 2, completedAt: null },
        ],
      },
    ]);

    expect(picked).toEqual({
      performedAt: '2026-06-02T10:00:00.000Z',
      sets: [{ order: 1, completedAt: done }],
    });
  });

  it('falls back to an older candidate when the latest has no performed set', () => {
    const picked = pickLastPerformance([
      {
        performedAt: '2026-06-03T10:00:00.000Z',
        sessionHasCompletedSet: true,
        sets: [{ order: 1, completedAt: null }],
      },
      {
        performedAt: '2026-06-01T10:00:00.000Z',
        sessionHasCompletedSet: true,
        sets: [{ order: 1, completedAt: done }],
      },
    ]);

    expect(picked?.performedAt).toBe('2026-06-01T10:00:00.000Z');
  });

  it('treats a legacy candidate as fully performed', () => {
    const picked = pickLastPerformance([
      {
        performedAt: '2026-05-30T08:00:00.000Z',
        sessionHasCompletedSet: false,
        sets: [{ order: 1 }, { order: 2 }],
      },
    ]);

    expect(picked?.sets).toHaveLength(2);
  });

  it('returns null when no candidate has a performed set', () => {
    expect(
      pickLastPerformance([
        {
          performedAt: '2026-06-03T10:00:00.000Z',
          sessionHasCompletedSet: true,
          sets: [{ order: 1, completedAt: null }],
        },
      ]),
    ).toBeNull();
    expect(pickLastPerformance([])).toBeNull();
  });
});
