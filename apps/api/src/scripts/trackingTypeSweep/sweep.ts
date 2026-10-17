import type { ExerciseTrackingType } from '@workout/domain';

import {
  EXERCISE_TRACKING_TYPES,
  isExerciseTrackingType,
  toExerciseTrackingType,
} from '../../features/exercises/trackingTypes.js';
import type { Classification, ClassifierInput, TrackingCorrections } from './classify.js';

/**
 * Pure planning of the tracking type sweep (spec 0030): the report rows, what
 * apply would change or skip, and what an undo would revert. The script does
 * the I/O around it.
 */

/** One catalog exercise as the script reads it (wger, system-defined). */
export type CatalogRow = {
  sourceId: string;
  name: string;
  language?: string | null;
  category?: string | null;
  equipment: string[];
  trackingType: string;
  /** `system` (default or a sweep) or `person` (set by hand). */
  trackingTypeSetBy: string;
  isUnilateral: boolean;
  routineUses: number;
  workoutUses: number;
  /** The movement's names in other languages (wger translations). */
  translations: Array<{ language?: string; name: string }>;
};

export type SweepStatus = 'change' | 'same' | 'skipped: set by a person';

export type SweepRow = {
  sourceId: string;
  name: string;
  language?: string;
  englishName?: string;
  otherNames: string[];
  category?: string;
  equipment: string[];
  current: ExerciseTrackingType;
  proposed: ExerciseTrackingType;
  reason: string;
  certain: boolean;
  setBy: string;
  routineUses: number;
  workoutUses: number;
  status: SweepStatus;
  /** Marked unilateral but moving to a type without reps (EF-7). */
  unilateralWithoutReps: boolean;
};

export type MissingOverride = { sourceId: string; name?: string; from: 'owner correction' | '0021 list' };

export type SweepPlan = {
  /** Every catalog exercise once (FR-1), used changes first (FR-2). */
  rows: SweepRow[];
  /** Per proposed type; sums to the catalog size (AC-1). */
  totals: Record<ExerciseTrackingType, number>;
  changes: SweepRow[];
  /** Would change but a person set the type (FR-6, FR-8, AC-5). */
  skipped: SweepRow[];
  unilateralFlags: SweepRow[];
  /** Corrections and 0021-list ids not in this database (EF-1). */
  missing: MissingOverride[];
};

const REPS_TYPES: readonly ExerciseTrackingType[] = ['weight_reps', 'reps'];

function uses(row: Pick<SweepRow, 'routineUses' | 'workoutUses'>): number {
  return row.routineUses + row.workoutUses;
}

function compareRows(left: SweepRow, right: SweepRow): number {
  const rank = (row: SweepRow) =>
    row.status === 'change' ? (uses(row) > 0 ? 0 : 1) : row.status === 'same' ? 3 : 2;
  return (
    rank(left) - rank(right) ||
    uses(right) - uses(left) ||
    left.name.localeCompare(right.name)
  );
}

/** Names for the classifier: the stored one first, then every translation. */
export function classifierInput(row: CatalogRow): ClassifierInput {
  return {
    sourceId: row.sourceId,
    names: [row.name, ...row.translations.map((translation) => translation.name)],
    category: row.category,
    equipment: row.equipment,
  };
}

export function planSweep(
  catalog: CatalogRow[],
  classify: (input: ClassifierInput) => Classification,
  overrides: {
    corrections?: TrackingCorrections;
    curated?: Map<string, ExerciseTrackingType>;
    curatedNames?: Map<string, string>;
  } = {},
): SweepPlan {
  const rows = catalog.map((exercise): SweepRow => {
    const proposal = classify(classifierInput(exercise));
    const current = toExerciseTrackingType(exercise.trackingType);
    const byPerson = exercise.trackingTypeSetBy === 'person';
    const status: SweepStatus =
      proposal.type === current ? 'same' : byPerson ? 'skipped: set by a person' : 'change';
    const otherNames = [
      ...new Set(
        exercise.translations
          .map((translation) => translation.name.trim())
          .filter((name) => name && name !== exercise.name),
      ),
    ];

    return {
      sourceId: exercise.sourceId,
      name: exercise.name,
      language: exercise.language ?? undefined,
      englishName: exercise.translations.find((translation) => translation.language === 'en')
        ?.name,
      otherNames,
      category: exercise.category ?? undefined,
      equipment: exercise.equipment,
      current,
      proposed: proposal.type,
      reason: proposal.reason,
      certain: proposal.certain,
      setBy: exercise.trackingTypeSetBy,
      routineUses: exercise.routineUses,
      workoutUses: exercise.workoutUses,
      status,
      unilateralWithoutReps:
        exercise.isUnilateral && status === 'change' && !REPS_TYPES.includes(proposal.type),
    };
  });

  rows.sort(compareRows);

  const totals = Object.fromEntries(EXERCISE_TRACKING_TYPES.map((type) => [type, 0])) as Record<
    ExerciseTrackingType,
    number
  >;
  for (const row of rows) {
    totals[row.proposed] += 1;
  }

  const present = new Set(catalog.map((exercise) => exercise.sourceId));
  const missing: MissingOverride[] = [
    ...Object.entries(overrides.corrections ?? {})
      .filter(([sourceId]) => !present.has(sourceId))
      .map(([sourceId, entry]) => ({
        sourceId,
        name: entry.name,
        from: 'owner correction' as const,
      })),
    ...[...(overrides.curated?.keys() ?? [])]
      .filter((sourceId) => !present.has(sourceId))
      .map((sourceId) => ({
        sourceId,
        name: overrides.curatedNames?.get(sourceId),
        from: '0021 list' as const,
      })),
  ];

  return {
    rows,
    totals,
    changes: rows.filter((row) => row.status === 'change'),
    skipped: rows.filter((row) => row.status === 'skipped: set by a person'),
    unilateralFlags: rows.filter((row) => row.unilateralWithoutReps),
    missing,
  };
}

/**
 * The owner's corrections file (FR-4): `{ "<sourceId>": { "type": "...",
 * "name": "..." } }` or `{ "<sourceId>": "<type>" }`. Keys starting with `_`
 * are notes. Any bad entry is an error naming it, and the script stops before
 * changing anything (EF-2).
 */
export function parseCorrections(
  raw: unknown,
): { corrections: TrackingCorrections; errors: string[] } {
  const corrections: TrackingCorrections = {};
  const errors: string[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { corrections, errors: ['the corrections file must be a JSON object'] };
  }

  for (const [sourceId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (sourceId.startsWith('_')) {
      continue;
    }

    const type =
      typeof entry === 'string'
        ? entry
        : typeof entry === 'object' && entry !== null
          ? (entry as Record<string, unknown>).type
          : undefined;
    const name =
      typeof entry === 'object' && entry !== null
        ? (entry as Record<string, unknown>).name
        : undefined;

    if (!isExerciseTrackingType(type)) {
      errors.push(
        `"${sourceId}"${typeof name === 'string' ? ` (${name})` : ''}: unknown tracking type ${JSON.stringify(type)}; use one of ${EXERCISE_TRACKING_TYPES.join(', ')}`,
      );
      continue;
    }

    corrections[sourceId] = typeof name === 'string' ? { type, name } : { type };
  }

  return { corrections, errors };
}

const CSV_COLUMNS = [
  'status',
  'source_id',
  'name',
  'language',
  'english_name',
  'other_names',
  'category',
  'equipment',
  'current_type',
  'proposed_type',
  'certainty',
  'reason',
  'set_by',
  'routine_uses',
  'workout_uses',
  'unilateral_without_reps',
] as const;

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** The review report: one line per catalog exercise, in plan order. */
export function toCsv(rows: SweepRow[]): string {
  const lines = rows.map((row) =>
    [
      row.status,
      row.sourceId,
      row.name,
      row.language ?? '',
      row.englishName ?? '',
      row.otherNames.join(' | '),
      row.category ?? '',
      row.equipment.join(' | '),
      row.current,
      row.proposed,
      row.certain ? 'certain' : 'uncertain',
      row.reason,
      row.setBy,
      row.routineUses,
      row.workoutUses,
      row.unilateralWithoutReps ? 'yes' : '',
    ]
      .map(csvCell)
      .join(','),
  );

  return `${[CSV_COLUMNS.join(','), ...lines].join('\n')}\n`;
}

/** What one apply run changed, kept so it can be undone (FR-9). */
export type SweepRunLog = {
  appliedAt: string;
  changes: Array<{
    sourceId: string;
    name: string;
    from: ExerciseTrackingType;
    to: ExerciseTrackingType;
  }>;
};

export function buildRunLog(plan: SweepPlan, appliedAt: Date): SweepRunLog {
  return {
    appliedAt: appliedAt.toISOString(),
    changes: plan.changes.map((row) => ({
      sourceId: row.sourceId,
      name: row.name,
      from: row.current,
      to: row.proposed,
    })),
  };
}

export function parseRunLog(raw: unknown): SweepRunLog | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const log = raw as Record<string, unknown>;
  if (typeof log.appliedAt !== 'string' || !Array.isArray(log.changes)) {
    return null;
  }
  const valid = log.changes.every(
    (change) =>
      typeof change === 'object' &&
      change !== null &&
      typeof (change as Record<string, unknown>).sourceId === 'string' &&
      isExerciseTrackingType((change as Record<string, unknown>).from) &&
      isExerciseTrackingType((change as Record<string, unknown>).to),
  );
  return valid ? (raw as SweepRunLog) : null;
}

export type UndoPlan = {
  revert: Array<{ sourceId: string; name: string; from: ExerciseTrackingType; to: ExerciseTrackingType }>;
  kept: Array<{ sourceId: string; name: string; reason: string }>;
};

/**
 * Reverts a run: only exercises still at the type the run gave them and
 * still set by the system. A type a person changed since stays (AC-9).
 */
export function planUndo(
  run: SweepRunLog,
  current: Map<string, { trackingType: string; trackingTypeSetBy: string }>,
): UndoPlan {
  const plan: UndoPlan = { revert: [], kept: [] };

  for (const change of run.changes) {
    const now = current.get(change.sourceId);
    if (!now) {
      plan.kept.push({ ...change, reason: 'not in this database' });
    } else if (now.trackingTypeSetBy === 'person') {
      plan.kept.push({ ...change, reason: 'set by a person since' });
    } else if (now.trackingType !== change.to) {
      plan.kept.push({ ...change, reason: `changed since (now ${now.trackingType})` });
    } else {
      plan.revert.push({
        sourceId: change.sourceId,
        name: change.name,
        from: change.to,
        to: change.from,
      });
    }
  }

  return plan;
}

/** Changes grouped by (from, to), one guarded update each. */
export function groupByTransition<T extends { from: ExerciseTrackingType; to: ExerciseTrackingType }>(
  changes: T[],
): Array<{ from: ExerciseTrackingType; to: ExerciseTrackingType; items: T[] }> {
  const groups = new Map<string, { from: ExerciseTrackingType; to: ExerciseTrackingType; items: T[] }>();
  for (const change of changes) {
    const key = `${change.from}>${change.to}`;
    const group = groups.get(key) ?? { from: change.from, to: change.to, items: [] };
    group.items.push(change);
    groups.set(key, group);
  }
  return [...groups.values()];
}
