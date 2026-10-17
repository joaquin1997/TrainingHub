import { describe, expect, it } from 'vitest';

import { exerciseVolumeKg, summarizeSession } from './sessionStats';

const done = { completedAt: '2026-10-16T10:00:00Z' };

describe('summarizeSession', () => {
  it('counts every set but only performed work toward volume and rest', () => {
    const summary = summarizeSession({
      exercises: [
        {
          sets: [
            { reps: 10, weightKg: 60, restSeconds: 90, ...done },
            { reps: 8, weightKg: 80, restSeconds: 120, ...done },
            { reps: 8, weightKg: 80, restSeconds: 120 },
          ],
        },
        { sets: [{ reps: 12, weightKg: 20.5, ...done }] },
      ],
    });

    expect(summary).toEqual({
      totalSets: 4,
      doneSets: 3,
      volumeKg: 1486,
      restSeconds: 210,
      durationSeconds: 0,
      distanceMeters: 0,
    });
  });

  it('totals time and distance apart from volume (spec 0021 AC-1, FR-5)', () => {
    const summary = summarizeSession({
      exercises: [
        { sets: [{ reps: 8, weightKg: 50, ...done }] },
        { sets: [{ durationSeconds: 60, ...done }, { durationSeconds: 45 }] },
        { sets: [{ distanceMeters: 500, durationSeconds: 105, ...done }] },
      ],
    });

    expect(summary).toMatchObject({ volumeKg: 400, durationSeconds: 165, distanceMeters: 500 });
  });

  it('trusts the server performed flag over completedAt', () => {
    const summary = summarizeSession({
      exercises: [{ sets: [{ reps: 5, weightKg: 100, performed: true }, { reps: 5, weightKg: 100, performed: false, ...done }] }],
    });

    expect(summary.doneSets).toBe(1);
    expect(summary.volumeKg).toBe(500);
  });

  it('treats missing reps or weight as no volume', () => {
    expect(summarizeSession({ exercises: [{ sets: [{ reps: 10, ...done }] }] }).volumeKg).toBe(0);
  });
});

describe('exerciseVolumeKg', () => {
  it('sums performed sets of one exercise', () => {
    expect(exerciseVolumeKg({ sets: [{ reps: 3, weightKg: 102.5, ...done }, { reps: 3, weightKg: 102.5 }] })).toBe(308);
  });
});
