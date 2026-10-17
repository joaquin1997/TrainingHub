import i18n from 'i18next';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';
import { es } from '@/i18n/locales/es';

import { bestSet, buildShareCard, type ShareCardInput } from './shareCard';
import type { ShareSet } from './shareText';

const translator = i18n.createInstance();
void translator.init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
});

const set = (values: Partial<ShareSet>): ShareSet => ({ type: 'normal', performed: true, ...values });

const base: ShareCardInput = {
  title: 'Torso A',
  when: '2026-10-15T18:00:00.000Z',
  durationSeconds: 3130,
  volumeKg: 2400,
  unit: 'kg',
  language: 'en',
  notes: 'Private note',
  t: translator.getFixedT('en'),
  exercises: [
    {
      name: 'Bench press',
      sets: [
        set({ weightKg: 60, reps: 10, type: 'warmup' }),
        set({ weightKg: 100, reps: 5 }),
        set({ weightKg: 100, reps: 6 }),
        set({ weightKg: 120, reps: 1, performed: false }),
      ],
    },
    { name: 'Skipped', sets: [set({ weightKg: 10, reps: 5, performed: false })] },
  ],
  records: [{ exerciseName: 'Bench press', title: 'Heaviest weight', value: '100 kg × 6' }],
};

describe('bestSet', () => {
  it('takes the heaviest performed working set, then the most reps', () => {
    expect(bestSet(base.exercises[0]!.sets)).toMatchObject({ weightKg: 100, reps: 6 });
  });

  it('uses warm-ups only when there is nothing else', () => {
    expect(
      bestSet([set({ weightKg: 40, reps: 10, type: 'warmup' }), set({ weightKg: 50, reps: 8, type: 'warmup' })]),
    ).toMatchObject({ weightKg: 50 });
  });

  it('takes the longest time, the longest distance, or the most reps by tracking', () => {
    expect(bestSet([set({ durationSeconds: 60 }), set({ durationSeconds: 90 })])).toMatchObject({
      durationSeconds: 90,
    });
    expect(
      bestSet([
        set({ distanceMeters: 1000, durationSeconds: 300 }),
        set({ distanceMeters: 1500, durationSeconds: 500 }),
      ]),
    ).toMatchObject({ distanceMeters: 1500 });
    expect(bestSet([set({ reps: 12 }), set({ reps: 15 }), set({ reps: 15 })])).toMatchObject({ reps: 15 });
  });

  it('is null when nothing was performed', () => {
    expect(bestSet([set({ reps: 5, performed: false })])).toBeNull();
  });
});

describe('buildShareCard', () => {
  it('holds title, date, the three stats, records and best sets only (FR-25)', () => {
    const card = buildShareCard(base);

    expect(card).toEqual({
      title: 'Torso A',
      date: 'Thursday, October 15',
      stats: [
        { key: 'duration', label: 'Duration', value: '52:10' },
        { key: 'volume', label: 'Volume', value: '2400', unit: 'kg' },
        { key: 'sets', label: 'Sets', value: '3' },
      ],
      records: base.records,
      moreRecords: undefined,
      exercises: [{ name: 'Bench press', best: '100 kg × 6' }],
      footer: 'Logged with TrainingHub',
    });
    expect(JSON.stringify(card)).not.toContain('Private note');
  });

  it('formats every tracking type', () => {
    const card = buildShareCard({
      ...base,
      exercises: [
        { name: 'Plank', sets: [set({ durationSeconds: 75 })] },
        { name: 'Row erg', sets: [set({ distanceMeters: 2000, durationSeconds: 470 })] },
        { name: 'Pull-up', sets: [set({ reps: 12 })] },
        { name: 'Lunge', sets: [set({ weightKg: 20, reps: 18, repsLeft: 10, repsRight: 8 })] },
      ],
    });

    expect(card.exercises).toEqual([
      { name: 'Plank', best: '1:15' },
      { name: 'Row erg', best: '2 km · 7:50' },
      { name: 'Pull-up', best: '12 reps' },
      { name: 'Lunge', best: '20 kg × 10 L / 8 R' },
    ]);
  });

  it('keeps five exercises in workout order and three records, with "+n more"', () => {
    const card = buildShareCard({
      ...base,
      exercises: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name) => ({
        name,
        sets: [set({ weightKg: 10, reps: 10 })],
      })),
      records: ['A', 'B', 'C', 'D', 'E'].map((name) => ({
        exerciseName: name,
        title: 'Most reps',
        value: '10 reps',
      })),
    });

    expect(card.exercises.map((exercise) => exercise.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(card.records.map((record) => record.exerciseName)).toEqual(['A', 'B', 'C']);
    expect(card.moreRecords).toBe('+2 more');
  });

  it('has no records block without records, and no duration when unknown', () => {
    const card = buildShareCard({ ...base, records: undefined, durationSeconds: null });

    expect(card.records).toEqual([]);
    expect(card.moreRecords).toBeUndefined();
    expect(card.stats.map((stat) => stat.key)).toEqual(['volume', 'sets']);
  });

  it('uses the display unit and the language (Spanish, lb)', () => {
    const card = buildShareCard({
      ...base,
      unit: 'lb',
      language: 'es',
      t: translator.getFixedT('es'),
      records: Array.from({ length: 4 }, () => base.records![0]!),
    });

    expect(card.date).toBe('Jueves, 15 de octubre');
    expect(card.stats).toEqual([
      { key: 'duration', label: 'Duración', value: '52:10' },
      { key: 'volume', label: 'Volumen', value: '5291', unit: 'lb' },
      { key: 'sets', label: 'Series', value: '3' },
    ]);
    expect(card.exercises).toEqual([{ name: 'Bench press', best: '220.5 lb × 6' }]);
    expect(card.moreRecords).toBe('+1 más');
    expect(card.footer).toBe('Registrado con TrainingHub');
  });
});
