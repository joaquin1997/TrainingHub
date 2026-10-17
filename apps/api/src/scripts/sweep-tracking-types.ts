import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fetchAllWgerExerciseInfos,
  fetchAllWgerLanguages,
} from '../features/exercises/importers/wger/client.js';
import { prisma } from '../infrastructure/prisma.js';

import { classifyExercise, type TrackingCorrections } from './trackingTypeSweep/classify.js';
import { CURATED_TRACKING_TYPES, curatedTypeBySourceId } from './trackingTypeSweep/curated.js';
import {
  buildRunLog,
  groupByTransition,
  parseCorrections,
  parseRunLog,
  planSweep,
  planUndo,
  toCsv,
  type CatalogRow,
  type SweepPlan,
} from './trackingTypeSweep/sweep.js';

/**
 * Tracking type sweep of the catalog (spec 0030): report -> review -> apply,
 * with undo. Data, not schema (constitution art. 5): run by the owner from
 * `apps/api` against the server's database, never by a deploy.
 *
 * - `pnpm run catalog:tracking-sweep` — report only (FR-5): classifies every
 *   catalog (wger, system) exercise from its names in every language wger
 *   has, category and equipment; writes `tmp/tracking-type-sweep.csv`.
 * - `pnpm run catalog:tracking-sweep:apply` (`SWEEP_APPLY=true`) — the same,
 *   then changes the exercises whose type the system set, in one
 *   transaction (EF-3), and keeps a run file for undo. A second run changes
 *   nothing (FR-7).
 * - `SWEEP_UNDO=<run file> pnpm run catalog:tracking-sweep:undo` — reverts a
 *   run, except exercises a person (or a later run) changed since (FR-9).
 *
 * Corrections: `src/scripts/data/tracking-type-corrections.json`,
 * `{ "<sourceId>": { "type": "duration", "name": "Burpees" } }`. A type set by
 * a person (`trackingTypeSetBy = 'person'`) and custom exercises are never
 * touched (FR-6). wger must be reachable; `SWEEP_WITHOUT_TRANSLATIONS=true`
 * classifies from the stored name only (local checks).
 */

const REPORT_CSV = process.env.CSV_OUTPUT_PATH ?? 'tmp/tracking-type-sweep.csv';
const RUNS_DIR = 'tmp/tracking-type-sweep-runs';
const CORRECTIONS_FILE = 'tracking-type-corrections.json';

/** The catalog the sweep may change: wger exercises defined by the system. */
const CATALOG_WHERE = { source: 'wger', isSystemDefined: true } as const;

async function loadCorrections(): Promise<TrackingCorrections> {
  // dist/apps/api/src/scripts -> apps/api/src/scripts/data (also valid from src/).
  const candidates = [
    new URL(`./data/${CORRECTIONS_FILE}`, import.meta.url),
    new URL(`../../../../../src/scripts/data/${CORRECTIONS_FILE}`, import.meta.url),
  ];

  for (const url of candidates) {
    let text: string;
    try {
      text = await readFile(fileURLToPath(url), 'utf8');
    } catch {
      continue;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `${CORRECTIONS_FILE} is not valid JSON: ${error instanceof Error ? error.message : error}`,
      );
    }

    const { corrections, errors } = parseCorrections(raw);
    if (errors.length > 0) {
      // EF-2: nothing is changed while a correction is wrong.
      throw new Error(`Fix ${CORRECTIONS_FILE} first:\n- ${errors.join('\n- ')}`);
    }
    return corrections;
  }

  console.log(`No ${CORRECTIONS_FILE} found: no owner corrections.`);
  return {};
}

type Translations = Map<string, Array<{ language?: string; name: string }>>;

async function loadTranslations(): Promise<Translations> {
  if (process.env.SWEEP_WITHOUT_TRANSLATIONS === 'true') {
    console.log('SWEEP_WITHOUT_TRANSLATIONS=true: classifying from the stored names only.');
    return new Map();
  }

  console.log('Fetching wger languages and translations...');
  const languages = await fetchAllWgerLanguages();
  const codeById = new Map(
    languages.map((language) => [language.id, language.short_name?.toLowerCase()]),
  );
  const translations: Translations = new Map();

  for (const info of await fetchAllWgerExerciseInfos()) {
    translations.set(
      String(info.id),
      (info.translations ?? [])
        .filter((translation) => Boolean(translation.name?.trim()))
        .map((translation) => ({
          language:
            translation.language !== undefined ? codeById.get(translation.language) : undefined,
          name: translation.name!.trim(),
        })),
    );
  }

  return translations;
}

async function loadCatalog(translations: Translations): Promise<CatalogRow[]> {
  const [exercises, routineCounts, workoutCounts] = await Promise.all([
    prisma.exercise.findMany({
      where: CATALOG_WHERE,
      select: {
        id: true,
        sourceId: true,
        name: true,
        language: true,
        category: true,
        equipment: true,
        trackingType: true,
        trackingTypeSetBy: true,
        isUnilateral: true,
      },
    }),
    prisma.routineExercise.groupBy({ by: ['exerciseId'], _count: { _all: true } }),
    prisma.workoutExercise.groupBy({ by: ['exerciseId'], _count: { _all: true } }),
  ]);

  const routineUses = new Map(routineCounts.map((count) => [count.exerciseId, count._count._all]));
  const workoutUses = new Map(workoutCounts.map((count) => [count.exerciseId, count._count._all]));

  return exercises.map((exercise) => ({
    sourceId: exercise.sourceId,
    name: exercise.name,
    language: exercise.language,
    category: exercise.category,
    equipment: exercise.equipment,
    trackingType: exercise.trackingType,
    trackingTypeSetBy: exercise.trackingTypeSetBy,
    isUnilateral: exercise.isUnilateral,
    routineUses: routineUses.get(exercise.id) ?? 0,
    workoutUses: workoutUses.get(exercise.id) ?? 0,
    translations: translations.get(exercise.sourceId) ?? [],
  }));
}

function printReport(plan: SweepPlan, withTranslations: number) {
  const uncertain = plan.rows.filter((row) => !row.certain).length;
  console.log(
    `${plan.rows.length} catalog exercises (${withTranslations} with wger translations); ${plan.changes.length} would change, ${plan.skipped.length} skipped (set by a person), ${uncertain} uncertain.`,
  );
  console.log(
    `Proposed: ${Object.entries(plan.totals)
      .map(([type, count]) => `${type} ${count}`)
      .join(', ')}.`,
  );

  const used = plan.changes.filter((row) => row.routineUses + row.workoutUses > 0);
  if (used.length > 0) {
    console.log(`Would change and already used (${used.length}):`);
    for (const row of used) {
      console.log(
        `  ${row.name} [${row.sourceId}]: ${row.current} -> ${row.proposed} (${row.routineUses} in routines, ${row.workoutUses} in workouts; ${row.reason})`,
      );
    }
  }

  for (const row of plan.unilateralFlags) {
    console.log(
      `  Unilateral, moving to a type without reps (EF-7): ${row.name} [${row.sourceId}] -> ${row.proposed}`,
    );
  }

  for (const entry of plan.missing) {
    console.log(
      `  Not in this database (${entry.from}): ${entry.sourceId}${entry.name ? ` (${entry.name})` : ''}`,
    );
  }
}

async function apply(plan: SweepPlan) {
  for (const row of plan.skipped) {
    console.log(`Skipped, set by a person: ${row.name} [${row.sourceId}] stays ${row.current}`);
  }

  if (plan.changes.length === 0) {
    console.log('0 changed: the catalog already matches the classification.');
    return;
  }

  // Kept before writing, so a run cut halfway can still be undone.
  const run = buildRunLog(plan, new Date());
  const runFile = join(RUNS_DIR, `${run.appliedAt.replace(/[:.]/g, '-')}.json`);
  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(runFile, `${JSON.stringify(run, null, 2)}\n`);

  const groups = groupByTransition(run.changes);
  const results = await prisma.$transaction(
    groups.map((group) =>
      prisma.exercise.updateMany({
        where: {
          ...CATALOG_WHERE,
          sourceId: { in: group.items.map((item) => item.sourceId) },
          trackingType: group.from,
          trackingTypeSetBy: 'system',
        },
        data: { trackingType: group.to },
      }),
    ),
  );
  const changed = results.reduce((sum, result) => sum + result.count, 0);

  for (const change of run.changes) {
    console.log(`Changed: ${change.name} [${change.sourceId}] ${change.from} -> ${change.to}`);
  }
  console.log(`${changed} changed. Run file (for undo): ${runFile}`);
  if (changed < run.changes.length) {
    console.log(
      `${run.changes.length - changed} changed by someone in the meantime and were left; run the report again.`,
    );
  }
}

async function undo(runPath: string) {
  const run = parseRunLog(JSON.parse(await readFile(runPath, 'utf8')));
  if (!run) {
    throw new Error(`${runPath} is not a tracking type sweep run file`);
  }

  const rows = await prisma.exercise.findMany({
    where: { ...CATALOG_WHERE, sourceId: { in: run.changes.map((change) => change.sourceId) } },
    select: { sourceId: true, trackingType: true, trackingTypeSetBy: true },
  });
  const plan = planUndo(run, new Map(rows.map((row) => [row.sourceId, row])));

  for (const entry of plan.kept) {
    console.log(`Left as it is: ${entry.name} [${entry.sourceId}] — ${entry.reason}`);
  }

  const results = await prisma.$transaction(
    groupByTransition(plan.revert).map((group) =>
      prisma.exercise.updateMany({
        where: {
          ...CATALOG_WHERE,
          sourceId: { in: group.items.map((item) => item.sourceId) },
          trackingType: group.from,
          trackingTypeSetBy: 'system',
        },
        data: { trackingType: group.to },
      }),
    ),
  );

  for (const entry of plan.revert) {
    console.log(`Reverted: ${entry.name} [${entry.sourceId}] ${entry.from} -> ${entry.to}`);
  }
  console.log(
    `${results.reduce((sum, result) => sum + result.count, 0)} reverted, ${plan.kept.length} left (run of ${run.appliedAt}).`,
  );
}

async function main() {
  const undoPath = process.env.SWEEP_UNDO;
  if (process.env.SWEEP_MODE === 'undo' && !undoPath) {
    throw new Error(`Set SWEEP_UNDO to a run file in ${RUNS_DIR}/`);
  }
  if (undoPath) {
    await undo(undoPath);
    return;
  }

  const corrections = await loadCorrections();
  const curated = curatedTypeBySourceId();
  const curatedNames = new Map(
    Object.values(CURATED_TRACKING_TYPES).flatMap((entries) => Object.entries(entries)),
  );
  const translations = await loadTranslations();
  const catalog = await loadCatalog(translations);

  const plan = planSweep(
    catalog,
    (input) => classifyExercise(input, { corrections, curated }),
    { corrections, curated, curatedNames },
  );

  await mkdir(dirname(REPORT_CSV), { recursive: true });
  await writeFile(REPORT_CSV, toCsv(plan.rows));
  printReport(plan, catalog.filter((row) => row.translations.length > 0).length);
  console.log(`Report: ${REPORT_CSV}`);

  if (process.env.SWEEP_APPLY !== 'true') {
    console.log('Report only: nothing changed. Run catalog:tracking-sweep:apply to apply.');
    return;
  }

  await apply(plan);
}

main()
  .catch((error) => {
    console.error('Tracking type sweep failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
