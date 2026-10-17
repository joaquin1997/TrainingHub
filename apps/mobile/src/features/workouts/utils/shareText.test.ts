import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';
import { es } from '@/i18n/locales/es';

import { formatWorkoutShareText, type ShareWorkoutInput } from './shareText';

const translator = (locale: Record<string, unknown>) => (key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale) as string;

const base: ShareWorkoutInput = {
  title: 'Torso A',
  when: '2026-10-15T18:00:00.000Z',
  durationSeconds: 3130,
  volumeKg: 1000,
  unit: 'kg',
  language: 'en',
  t: translator(en as Record<string, unknown>),
  notes: 'Felt strong',
  exercises: [
    {
      name: 'Bench press',
      sets: [
        { weightKg: 60, reps: 10, type: 'warmup', performed: true },
        { weightKg: 80, reps: 8, type: 'normal', performed: true },
        { weightKg: 80, reps: null, type: 'normal', performed: false },
      ],
    },
    { name: 'Skipped', sets: [{ weightKg: 10, reps: 5, type: 'normal', performed: false }] },
  ],
};

describe('formatWorkoutShareText', () => {
  it('lists title, date, stats and only performed sets', () => {
    const text = formatWorkoutShareText(base);
    expect(text).toBe(
      [
        'Torso A',
        'Thursday, October 15',
        'Duration 52:10 · Volume 1000 kg',
        '',
        'Bench press',
        '1. 60 kg × 10 (Warmup)',
        '2. 80 kg × 8',
        '',
        'Notes: Felt strong',
      ].join('\n'),
    );
    expect(text).not.toContain('Skipped');
  });

  it('converts to pounds and uses the app language', () => {
    const text = formatWorkoutShareText({
      ...base,
      unit: 'lb',
      language: 'es',
      t: translator(es as Record<string, unknown>),
      notes: undefined,
    });
    expect(text).toContain('Duración 52:10 · Volumen 2204.6 lb');
    expect(text).toContain('1. 132.3 lb × 10 (Calentamiento)');
    expect(text).toMatch(/jueves, 15 de octubre/i);
  });

  it('omits title and duration when unknown', () => {
    const text = formatWorkoutShareText({ ...base, title: undefined, durationSeconds: null });
    expect(text.split('\n').slice(0, 2)).toEqual(['Thursday, October 15', 'Volume 1000 kg']);
  });

  it('shows time and distance sets as logged (spec 0021)', () => {
    const text = formatWorkoutShareText({
      ...base,
      exercises: [
        { name: 'Plank', sets: [{ durationSeconds: 60, type: 'normal', performed: true }] },
        {
          name: 'Rowing Machine',
          sets: [{ distanceMeters: 500, durationSeconds: 105, type: 'normal', performed: true }],
        },
      ],
    });

    expect(text).toContain('Plank\n1. 1:00');
    expect(text).toContain('Rowing Machine\n1. 500 m · 1:45');
  });

  it('shows both sides of a unilateral set in the app language (spec 0022)', () => {
    const exercises = [
      {
        name: 'Bulgarian split squat',
        sets: [
          { weightKg: 20, reps: 18, repsLeft: 10, repsRight: 8, type: 'normal' as const, performed: true },
        ],
      },
    ];

    expect(formatWorkoutShareText({ ...base, exercises })).toContain(
      'Bulgarian split squat\n1. 20 kg × 10 L / 8 R',
    );
    expect(
      formatWorkoutShareText({
        ...base,
        exercises,
        language: 'es',
        t: translator(es as Record<string, unknown>),
      }),
    ).toContain('1. 20 kg × 10 I / 8 D');
  });
});
