import { describe, expect, it } from 'vitest';

import { classifyExercise } from './classify.js';
import {
  buildRunLog,
  groupByTransition,
  parseCorrections,
  parseRunLog,
  planSweep,
  planUndo,
  toCsv,
  type CatalogRow,
} from './sweep.js';

function row(sourceId: string, name: string, extra: Partial<CatalogRow> = {}): CatalogRow {
  return {
    sourceId,
    name,
    language: 'es',
    category: null,
    equipment: [],
    trackingType: 'weight_reps',
    trackingTypeSetBy: 'system',
    isUnilateral: false,
    routineUses: 0,
    workoutUses: 0,
    translations: [],
    ...extra,
  };
}

const catalog: CatalogRow[] = [
  row('1', 'Press banca', { equipment: ['Barbell'], workoutUses: 30 }),
  row('2', 'Plancha', {
    workoutUses: 4,
    routineUses: 1,
    translations: [
      { language: 'en', name: 'Plank' },
      { language: 'de', name: 'Unterarmstütz' },
    ],
  }),
  row('3', 'Flexiones'),
  row('4', 'Mountain climbers', { trackingType: 'duration', trackingTypeSetBy: 'person' }),
  row('5', 'Remoergómetro', { workoutUses: 9 }),
  row('6', 'Superman'),
  row('7', 'Zancada en carrera', { isUnilateral: true }),
  row('8', 'Sentadilla isométrica unilateral', { isUnilateral: true }),
];

const classify = (input: Parameters<typeof classifyExercise>[0]) => classifyExercise(input);

describe('planSweep — the report (FR-1, FR-2, AC-1)', () => {
  const plan = planSweep(catalog, classify);

  it('lists every catalog exercise exactly once and the totals add up', () => {
    expect(plan.rows).toHaveLength(catalog.length);
    expect(new Set(plan.rows.map((entry) => entry.sourceId)).size).toBe(catalog.length);
    expect(Object.values(plan.totals).reduce((sum, count) => sum + count, 0)).toBe(
      catalog.length,
    );
    expect(plan.totals).toEqual({
      weight_reps: 3,
      reps: 2,
      duration: 2,
      weight_duration: 0,
      distance_duration: 1,
    });
  });

  it('lists first the changes already used, most used first', () => {
    expect(plan.rows.slice(0, 2).map((entry) => entry.name)).toEqual([
      'Remoergómetro',
      'Plancha',
    ]);
    expect(plan.rows.at(-1)?.status).toBe('same');
  });

  it('carries the names in other languages, English apart', () => {
    const plank = plan.rows.find((entry) => entry.sourceId === '2');

    expect(plank).toMatchObject({
      englishName: 'Plank',
      otherNames: ['Plank', 'Unterarmstütz'],
      current: 'weight_reps',
      proposed: 'duration',
      certain: true,
      status: 'change',
      routineUses: 1,
      workoutUses: 4,
    });
  });

  it('marks undecidable exercises as uncertain weight & reps (FR-3)', () => {
    expect(plan.rows.find((entry) => entry.sourceId === '6')).toMatchObject({
      proposed: 'weight_reps',
      certain: false,
      status: 'same',
    });
  });
});

describe('planSweep — what apply would do', () => {
  it('skips a type a person set and says so (FR-6, AC-5)', () => {
    const plan = planSweep(catalog, classify);

    expect(plan.skipped.map((entry) => entry.name)).toEqual(['Mountain climbers']);
    expect(plan.changes.map((entry) => entry.sourceId)).not.toContain('4');
  });

  it('a swept catalog has nothing left to change (FR-7, AC-3)', () => {
    const first = planSweep(catalog, classify);
    const swept = catalog.map((exercise) => {
      const change = first.changes.find((entry) => entry.sourceId === exercise.sourceId);
      return change ? { ...exercise, trackingType: change.proposed } : exercise;
    });

    expect(first.changes.length).toBeGreaterThan(0);
    expect(planSweep(swept, classify).changes).toEqual([]);
  });

  it('flags a unilateral exercise moving to a type without reps (EF-7)', () => {
    const plan = planSweep(catalog, classify);

    expect(plan.unilateralFlags.map((entry) => entry.sourceId)).toEqual(['8']);
  });

  it('reports corrections and 0021-list ids missing from this database (EF-1)', () => {
    const plan = planSweep(catalog, classify, {
      corrections: { '999': { type: 'reps', name: 'Gone' }, '3': { type: 'reps' } },
      curated: new Map([
        ['1307', 'duration'],
        ['2', 'duration'],
      ]),
      curatedNames: new Map([['1307', 'Front Plank']]),
    });

    expect(plan.missing).toEqual([
      { sourceId: '999', name: 'Gone', from: 'owner correction' },
      { sourceId: '1307', name: 'Front Plank', from: '0021 list' },
    ]);
  });
});

describe('parseCorrections (FR-4, EF-2)', () => {
  it('reads both entry shapes and ignores notes', () => {
    expect(
      parseCorrections({
        _readme: 'notes',
        '10': { type: 'duration', name: 'Burpees' },
        '11': 'reps',
      }),
    ).toEqual({
      corrections: { '10': { type: 'duration', name: 'Burpees' }, '11': { type: 'reps' } },
      errors: [],
    });
  });

  it('names every entry with a type that does not exist', () => {
    const { errors } = parseCorrections({
      '10': { type: 'weight_distance', name: 'Sled drag' },
      '11': {},
      '12': 'duration',
    });

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('"10" (Sled drag): unknown tracking type "weight_distance"');
    expect(errors[1]).toContain('"11"');
  });

  it('refuses a file that is not an object', () => {
    expect(parseCorrections([]).errors).toEqual(['the corrections file must be a JSON object']);
  });
});

describe('toCsv', () => {
  it('writes a header and one quoted line per exercise', () => {
    const csv = toCsv(planSweep(catalog.slice(1, 2), classify).rows);
    const [header, line] = csv.trim().split('\n');

    expect(header).toContain('status,source_id,name');
    expect(line).toContain('"change","2","Plancha","es","Plank","Plank | Unterarmstütz"');
    expect(line).toContain('"weight_reps","duration","certain"');
  });
});

describe('undo (FR-9, AC-9)', () => {
  const plan = planSweep(catalog, classify);
  const run = buildRunLog(plan, new Date('2026-10-18T10:00:00Z'));

  it('keeps every change of the run', () => {
    expect(run.appliedAt).toBe('2026-10-18T10:00:00.000Z');
    expect(run.changes).toContainEqual({
      sourceId: '2',
      name: 'Plancha',
      from: 'weight_reps',
      to: 'duration',
    });
    expect(parseRunLog(JSON.parse(JSON.stringify(run)))).toEqual(run);
    expect(parseRunLog({ appliedAt: 'x', changes: [{ sourceId: '1', from: 'x', to: 'reps' }] }))
      .toBeNull();
  });

  it('reverts what the run changed, except what a person changed since', () => {
    const current = new Map(
      run.changes.map((change) => [
        change.sourceId,
        { trackingType: change.to, trackingTypeSetBy: 'system' },
      ]),
    );
    current.set('3', { trackingType: 'duration', trackingTypeSetBy: 'person' });
    current.delete('5');

    const undo = planUndo(run, current);

    expect(undo.revert).toContainEqual({
      sourceId: '2',
      name: 'Plancha',
      from: 'duration',
      to: 'weight_reps',
    });
    expect(undo.kept).toEqual([
      { sourceId: '5', name: 'Remoergómetro', from: 'weight_reps', to: 'distance_duration', reason: 'not in this database' },
      { sourceId: '3', name: 'Flexiones', from: 'weight_reps', to: 'reps', reason: 'set by a person since' },
    ]);
  });

  it('groups changes by transition for one guarded update each', () => {
    const groups = groupByTransition(run.changes);

    expect(groups.map((group) => `${group.from}>${group.to}:${group.items.length}`).sort()).toEqual(
      ['weight_reps>distance_duration:1', 'weight_reps>duration:2', 'weight_reps>reps:1'],
    );
  });
});
