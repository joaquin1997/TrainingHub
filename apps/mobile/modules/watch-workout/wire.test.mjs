import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  decodeWatchMessage,
  encodeActiveContext,
  encodeEndContext,
} from '../../src/features/health/providers/appleWatchWire.ts';

const swift = readFileSync(new URL('../../targets/watch/WatchWire.swift', import.meta.url), 'utf8');

/** Every key of a JSON value, nested ones included. */
function keysOf(value, into = new Set()) {
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      into.add(key);
      keysOf(nested, into);
    }
  }
  return into;
}

const declared = (key) => new RegExp(`\\b(let|var) ${key}\\b`).test(swift);

const labels = {
  done: 'd',
  pause: 'p',
  resume: 'r',
  finish: 'f',
  rest: 'r',
  paused: 'p',
  finishOnPhone: 'f',
  allDone: 'a',
  waiting: 'w',
  setOf: (number, count) => `${number}/${count}`,
  more: 'm',
  discard: 'd',
  discardTitle: 't',
  cancel: 'c',
  connectToDiscard: 'c',
  waitingPhone: 'w',
  reps: 'r',
  discardLost: (count) => `${count}`,
};

describe('watch wire format (spec 0025)', () => {
  // The phone and the watch app are built together, but in two languages:
  // a renamed key would only show as a silent decode failure on the wrist.
  it('declares every key the phone sends in the watch app', () => {
    const context = JSON.parse(
      encodeActiveContext(
        {
          workoutSessionId: 'c1',
          routineName: 'Push',
          startedAt: '2026-10-17T09:00:00.000Z',
          pausedAt: '2026-10-17T09:01:00.000Z',
          pausedSeconds: 0,
          restEndsAt: '2026-10-17T09:02:00.000Z',
          currentSet: {
            workoutExerciseId: 'a',
            workoutSetId: 'a1',
            exerciseName: 'A',
            setNumber: 1,
            setCount: 3,
            target: '60 kg × 8',
            restSeconds: 90,
            reps: 8,
            load: '60 kg',
          },
        },
        labels,
      ),
    );
    const keys = [...keysOf(context), ...keysOf(JSON.parse(encodeEndContext('c1', 'finished')))];

    expect(keys.filter((key) => !declared(key))).toEqual([]);
  });

  it('reads every key the watch app sends', () => {
    // As `WatchEvent` / `WatchMetrics` encode them.
    const setDone = { v: 1, id: 'e1', kind: 'setDone', workoutId: 'c1', exerciseId: 'a', setId: 'a1', atMs: 0, reps: 8 };
    const metrics = { v: 1, workoutId: 'c1', kcal: 12 };

    expect([...keysOf(setDone), ...keysOf(metrics)].filter((key) => !declared(key))).toEqual([]);
    expect(decodeWatchMessage('event', JSON.stringify(setDone))).toMatchObject({ kind: 'setDone', reps: 8 });
    expect(decodeWatchMessage('metrics', JSON.stringify(metrics))?.kind).toBe('activeEnergy');
    for (const kind of ['setDone', 'pause', 'resume', 'finishRequested', 'discardRequested']) {
      expect(swift).toContain(`case ${kind}`);
    }
  });
});
