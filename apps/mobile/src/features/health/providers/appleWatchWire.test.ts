import { describe, expect, it } from 'vitest';

import {
  decodeWatchMessage,
  encodeActiveContext,
  encodeEndContext,
  type WatchLabels,
} from './appleWatchWire';

const labels: WatchLabels = {
  done: 'Hecha',
  pause: 'Pausar',
  resume: 'Reanudar',
  finish: 'Terminar',
  rest: 'Descanso',
  paused: 'En pausa',
  finishOnPhone: 'Confírmalo en el iPhone',
  allDone: 'Todas las series hechas',
  waiting: 'Empieza un entrenamiento en el iPhone',
  setOf: (number, count) => `Serie ${number} de ${count}`,
  more: 'Más',
  discard: 'Descartar',
  discardTitle: '¿Descartar?',
  cancel: 'Cancelar',
  connectToDiscard: 'Conecta con tu iPhone para descartar',
  waitingPhone: 'Esperando al iPhone…',
  reps: 'reps',
  discardLost: (count) => `Se perderán ${count}`,
};

describe('watch wire format (spec 0025)', () => {
  it('encodes a workout in progress with instants in ms and the labels', () => {
    const json = encodeActiveContext(
      {
        workoutSessionId: 'c1',
        routineName: 'Push',
        startedAt: '2026-10-17T09:00:00.000Z',
        pausedSeconds: 30,
        restEndsAt: '2026-10-17T09:10:00.000Z',
        setsDone: 3,
        currentSet: {
          workoutExerciseId: 'a',
          workoutSetId: 'a2',
          exerciseName: 'Bench',
          setNumber: 2,
          setCount: 4,
          target: '60 kg × 8',
          restSeconds: 120,
        },
      },
      labels,
      1000,
    );

    expect(JSON.parse(json)).toEqual({
      v: 1,
      status: 'active',
      workoutId: 'c1',
      sentAtMs: 1000,
      routineName: 'Push',
      startedAtMs: Date.parse('2026-10-17T09:00:00.000Z'),
      pausedSeconds: 30,
      restEndsAtMs: Date.parse('2026-10-17T09:10:00.000Z'),
      currentSet: {
        exerciseId: 'a',
        setId: 'a2',
        exerciseName: 'Bench',
        setTitle: 'Serie 2 de 4',
        target: '60 kg × 8',
        restSeconds: 120,
      },
      setsDone: 3,
      discardMessage: 'Se perderán 3',
      labels: {
        done: 'Hecha',
        pause: 'Pausar',
        resume: 'Reanudar',
        finish: 'Terminar',
        rest: 'Descanso',
        paused: 'En pausa',
        finishOnPhone: 'Confírmalo en el iPhone',
        allDone: 'Todas las series hechas',
        waiting: 'Empieza un entrenamiento en el iPhone',
        more: 'Más',
        discard: 'Descartar',
        discardTitle: '¿Descartar?',
        cancel: 'Cancelar',
        connectToDiscard: 'Conecta con tu iPhone para descartar',
        waitingPhone: 'Esperando al iPhone…',
        reps: 'reps',
      },
    });
  });

  it('encodes the end of a workout', () => {
    expect(JSON.parse(encodeEndContext('c1', 'discarded', 5))).toEqual({
      v: 1,
      status: 'discarded',
      workoutId: 'c1',
      sentAtMs: 5,
    });
  });

  it('decodes the watch requests and calories', () => {
    const atMs = Date.parse('2026-10-17T09:05:00.000Z');
    const event = (body: object) => decodeWatchMessage('event', JSON.stringify({ v: 1, ...body }));

    expect(
      event({ id: 'e1', kind: 'setDone', workoutId: 'c1', exerciseId: 'a', setId: 'a1', atMs }),
    ).toEqual({
      kind: 'setDone',
      id: 'e1',
      workoutSessionId: 'c1',
      workoutExerciseId: 'a',
      workoutSetId: 'a1',
      at: '2026-10-17T09:05:00.000Z',
    });
    // Spec 0041: reps chosen on the watch; out-of-range values are dropped.
    expect(
      event({ id: 'e1', kind: 'setDone', workoutId: 'c1', exerciseId: 'a', setId: 'a1', atMs, reps: 8 }),
    ).toMatchObject({ kind: 'setDone', reps: 8 });
    expect(
      event({ id: 'e1', kind: 'setDone', workoutId: 'c1', exerciseId: 'a', setId: 'a1', atMs, reps: 500 }),
    ).not.toHaveProperty('reps');
    expect(event({ id: 'e2', kind: 'pause', workoutId: 'c1', atMs })).toEqual({
      kind: 'pause',
      id: 'e2',
      workoutSessionId: 'c1',
      at: '2026-10-17T09:05:00.000Z',
    });
    expect(event({ id: 'e3', kind: 'finishRequested', workoutId: 'c1' })).toEqual({
      kind: 'finishRequested',
      id: 'e3',
      workoutSessionId: 'c1',
    });
    expect(decodeWatchMessage('metrics', '{"v":1,"workoutId":"c1","kcal":212.4}')).toEqual({
      kind: 'activeEnergy',
      workoutSessionId: 'c1',
      kcal: 212.4,
    });
  });

  it('ignores anything malformed or unknown', () => {
    const atMs = 1;
    expect(decodeWatchMessage('event', 'not json')).toBeNull();
    expect(decodeWatchMessage('event', 'null')).toBeNull();
    expect(decodeWatchMessage('event', '{"id":"e","kind":"setDone","workoutId":"c1","atMs":1}')).toBeNull();
    expect(decodeWatchMessage('event', JSON.stringify({ id: 'e', kind: 'jump', workoutId: 'c1', atMs }))).toBeNull();
    expect(decodeWatchMessage('event', JSON.stringify({ kind: 'pause', workoutId: 'c1', atMs }))).toBeNull();
    expect(decodeWatchMessage('metrics', '{"workoutId":"c1","kcal":-3}')).toBeNull();
    expect(decodeWatchMessage('other', '{"workoutId":"c1","kcal":3}')).toBeNull();
  });
});

describe('discard from the watch (spec 0035)', () => {
  it('reads a discard request', () => {
    const json = JSON.stringify({ v: 1, id: 'e9', kind: 'discardRequested', workoutId: 'c1' });
    expect(decodeWatchMessage('event', json)).toEqual({
      kind: 'discardRequested',
      id: 'e9',
      workoutSessionId: 'c1',
    });
  });
});
