import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Prisma } from '@prisma/client';

import { prisma } from '../infrastructure/prisma.js';
import { loadCatalog, validateCatalog } from './catalog/catalog.js';
import {
  curatedFields,
  droppedCurated,
  isEmptyPlan,
  planCurate,
  type CarryOverStep,
  type CuratedFields,
  type CuratePlan,
  type StoredCurated,
} from './catalog/curate.js';

/**
 * Applies the reviewed catalog (spec 0044): report → apply → undo. Data, not
 * schema (constitution art. 5): run by the owner from `apps/api` against the
 * server's database after a backup, never by a deploy.
 *
 * - `npm run catalog:curate` — report only, changes nothing.
 * - `npm run catalog:curate:apply` (`CURATE_APPLY=true`) — creates or updates
 *   the reviewed exercises, carries over what `data/catalog-carry-over.json`
 *   lists, retires the old import and the merged custom exercises, in one
 *   transaction; keeps a run file for undo. A second run changes nothing,
 *   except carrying over rows saved since against a retired exercise (EF-2).
 * - `CURATE_UNDO=<run file> npm run catalog:curate:undo` — reverts a run.
 */

const RUNS_DIR = 'tmp/catalog-curate-runs';
const MAP_FILE = 'catalog-carry-over.json';

interface CurateRun {
  kind: 'catalog-curate';
  appliedAt: string;
  createdMuscles: string[];
  created: string[];
  updated: Array<{ slug: string; before: Partial<CuratedFields> }>;
  restored: string[];
  carryOver: CarryOverStep[];
  retired: string[];
  droppedCurated: string[];
}

async function loadCarryOverMap(): Promise<Record<string, string>> {
  // CURATE_MAP: another map, for a local rehearsal on test data.
  if (process.env.CURATE_MAP) {
    return JSON.parse(await readFile(process.env.CURATE_MAP, 'utf8')) as Record<string, string>;
  }
  for (const url of [
    new URL(`./data/${MAP_FILE}`, import.meta.url),
    new URL(`../../../../../src/scripts/data/${MAP_FILE}`, import.meta.url),
  ]) {
    try {
      return JSON.parse(await readFile(fileURLToPath(url), 'utf8')) as Record<string, string>;
    } catch {
      // try the next location
    }
  }
  return {};
}

const linkNames = (links: Array<{ muscleGroup: { name: string } }>) =>
  links.map((link) => link.muscleGroup.name);

async function readState(carryOverMap: Record<string, string>) {
  const oldIds = Object.keys(carryOverMap);
  const [muscles, curatedRows, old, workoutExercises, routineExercises, favorites, curatedFavorites] =
    await Promise.all([
      prisma.muscleGroup.findMany({ select: { name: true } }),
      prisma.exercise.findMany({
        where: { source: 'curated' },
        include: {
          primaryMuscleGroupLinks: { include: { muscleGroup: true }, orderBy: { muscleGroupId: 'asc' } },
          secondaryMuscleGroupLinks: { include: { muscleGroup: true }, orderBy: { muscleGroupId: 'asc' } },
        },
      }),
      prisma.exercise.findMany({
        where: { source: { not: 'curated' } },
        select: {
          publicId: true,
          name: true,
          source: true,
          isSystemDefined: true,
          deletedAt: true,
          trackingType: true,
          trackingTypeSetBy: true,
        },
      }),
      prisma.workoutExercise.findMany({
        where: { exercise: { publicId: { in: oldIds } } },
        select: { id: true, exercise: { select: { publicId: true } } },
      }),
      prisma.routineExercise.findMany({
        where: { exercise: { publicId: { in: oldIds } } },
        select: { id: true, exerciseName: true, exercise: { select: { publicId: true } } },
      }),
      prisma.exerciseFavorite.findMany({
        where: { exercise: { publicId: { in: oldIds } } },
        select: { id: true, userId: true, exercise: { select: { publicId: true } } },
      }),
      prisma.exerciseFavorite.findMany({
        where: { exercise: { source: 'curated' } },
        select: { userId: true, exercise: { select: { sourceId: true } } },
      }),
    ]);

  const curated: StoredCurated[] = curatedRows.map((row) => ({
    sourceId: row.sourceId,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    name: row.name,
    nameEs: row.nameEs ?? '',
    nameEn: row.nameEn ?? '',
    aliases: row.aliases,
    category: row.category ?? '',
    equipment: row.equipment,
    loadingKind: row.loadingKind,
    trackingType: row.trackingType,
    isUnilateral: row.isUnilateral,
    imageUrl: row.imageUrl,
    // The catalog's order, so a reorder in the database is not a change.
    primary: linkNames(row.primaryMuscleGroupLinks),
    secondary: linkNames(row.secondaryMuscleGroupLinks),
  }));

  return {
    muscles: muscles.map((muscle) => muscle.name),
    curated,
    old: old.map((row) => ({ ...row, deletedAt: row.deletedAt?.toISOString() ?? null })),
    usage: {
      workoutExercises: workoutExercises.map((row) => ({
        id: row.id.toString(),
        exercisePublicId: row.exercise.publicId,
      })),
      routineExercises: routineExercises.map((row) => ({
        id: row.id.toString(),
        exerciseName: row.exerciseName,
        exercisePublicId: row.exercise.publicId,
      })),
      favorites: favorites.map((row) => ({
        id: row.id.toString(),
        userId: row.userId.toString(),
        exercisePublicId: row.exercise.publicId,
      })),
      curatedFavorites: curatedFavorites.map((row) => ({
        userId: row.userId.toString(),
        slug: row.exercise.sourceId,
      })),
    },
  };
}

/** Muscle names compared as sets: the database returns links by id. */
function normaliseMuscleOrder(plan: CuratePlan): CuratePlan {
  const sameSet = (left: unknown, right: unknown) =>
    Array.isArray(left) && Array.isArray(right) && [...left].sort().join() === [...right].sort().join();
  const updates = plan.updates
    .map((update) => {
      const before = { ...update.before };
      const after = { ...update.after };
      for (const key of ['primary', 'secondary'] as const) {
        if (key in after && sameSet(before[key], after[key])) {
          delete before[key];
          delete after[key];
        }
      }
      return { ...update, before, after };
    })
    .filter((update) => Object.keys(update.after).length > 0);
  return { ...plan, unchanged: plan.unchanged + (plan.updates.length - updates.length), updates };
}

function muscleLinks(fields: Pick<CuratedFields, 'primary' | 'secondary'>) {
  return {
    primaryMuscleGroupLinks: {
      create: fields.primary.map((name) => ({ muscleGroup: { connect: { name } } })),
    },
    secondaryMuscleGroupLinks: {
      create: fields.secondary.map((name) => ({ muscleGroup: { connect: { name } } })),
    },
  };
}

function scalarData(fields: Partial<CuratedFields>): Prisma.ExerciseUpdateInput {
  const { primary: _primary, secondary: _secondary, ...scalars } = fields;
  return scalars;
}

function printReport(plan: CuratePlan, dropped: string[]) {
  console.log(
    `Reviewed catalog: ${plan.creates.length} to create, ${plan.updates.length} to update, ${plan.restores.length} to bring back, ${plan.unchanged} unchanged; ${plan.newMuscles.length} new muscle groups (${plan.newMuscles.join(', ') || '—'}).`,
  );
  for (const update of plan.updates) {
    console.log(`  Update ${update.slug}: ${Object.keys(update.after).join(', ')}`);
  }
  for (const step of plan.carryOver) {
    console.log(
      `  Carry over "${step.fromName}" → ${step.to}: ${step.workoutExerciseIds.length} workout exercises, ${step.routineExercises.length} routine exercises, ${step.favoritesMoved.length} favourites (+${step.favoritesDropped.length} duplicates dropped)`,
    );
  }
  for (const line of plan.ignoredMap) {
    console.log(`  Not carried over: ${line.from} → ${line.to} (${line.reason})`);
  }
  for (const note of plan.trackingTypeNotes) {
    console.log(
      `  Note (FR-7): "${note.fromName}" was set by hand to ${note.was}; ${note.to} records ${note.becomes}`,
    );
  }
  console.log(
    `To retire: ${plan.retire.filter((row) => row.source === 'wger').length} old catalog exercises, ${plan.retire.filter((row) => row.source === 'custom').length} merged custom ones; ${dropped.length} reviewed exercises no longer in the file.`,
  );
}

async function apply(plan: CuratePlan, dropped: string[]) {
  if (isEmptyPlan(plan) && dropped.length === 0) {
    console.log('0 changed: the database already matches the reviewed catalog.');
    return;
  }

  const appliedAt = new Date();
  const catalog = new Map(loadCatalog().map((entry) => [entry.slug, entry]));
  const run: CurateRun = {
    kind: 'catalog-curate',
    appliedAt: appliedAt.toISOString(),
    createdMuscles: plan.newMuscles,
    created: plan.creates,
    updated: plan.updates.map((update) => ({ slug: update.slug, before: update.before })),
    restored: plan.restores,
    carryOver: plan.carryOver,
    retired: plan.retire.map((row) => row.publicId),
    droppedCurated: dropped,
  };
  // Kept before writing, so a run cut halfway can still be undone.
  const runFile = join(RUNS_DIR, `${run.appliedAt.replace(/[:.]/g, '-')}.json`);
  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(runFile, `${JSON.stringify(run, null, 2)}\n`);

  await prisma.$transaction(
    async (tx) => {
      for (const name of plan.newMuscles) {
        await tx.muscleGroup.create({ data: { name } });
      }
      for (const slug of plan.creates) {
        const fields = curatedFields(catalog.get(slug)!);
        await tx.exercise.create({
          data: {
            source: 'curated',
            sourceId: slug,
            isSystemDefined: true,
            language: 'es',
            ...scalarData(fields),
            ...muscleLinks(fields),
          } as Prisma.ExerciseCreateInput,
        });
      }
      for (const update of plan.updates) {
        const fields = curatedFields(catalog.get(update.slug)!);
        const where = { source_sourceId: { source: 'curated', sourceId: update.slug } };
        const musclesChanged = 'primary' in update.after || 'secondary' in update.after;
        await tx.exercise.update({
          where,
          data: {
            ...scalarData(update.after),
            ...(musclesChanged
              ? {
                  primaryMuscleGroupLinks: { deleteMany: {}, ...muscleLinks(fields).primaryMuscleGroupLinks },
                  secondaryMuscleGroupLinks: { deleteMany: {}, ...muscleLinks(fields).secondaryMuscleGroupLinks },
                }
              : {}),
          },
        });
      }
      if (plan.restores.length > 0) {
        await tx.exercise.updateMany({
          where: { source: 'curated', sourceId: { in: plan.restores } },
          data: { deletedAt: null },
        });
      }

      for (const step of plan.carryOver) {
        const target = await tx.exercise.findUniqueOrThrow({
          where: { source_sourceId: { source: 'curated', sourceId: step.to } },
          select: { id: true, nameEs: true, name: true },
        });
        if (step.workoutExerciseIds.length > 0) {
          await tx.workoutExercise.updateMany({
            where: { id: { in: step.workoutExerciseIds.map(BigInt) } },
            data: { exerciseId: target.id },
          });
        }
        if (step.routineExercises.length > 0) {
          await tx.routineExercise.updateMany({
            where: { id: { in: step.routineExercises.map((row) => BigInt(row.id)) } },
            data: { exerciseId: target.id, exerciseName: target.nameEs ?? target.name },
          });
        }
        if (step.favoritesMoved.length > 0) {
          await tx.exerciseFavorite.updateMany({
            where: { id: { in: step.favoritesMoved.map(BigInt) } },
            data: { exerciseId: target.id },
          });
        }
        if (step.favoritesDropped.length > 0) {
          await tx.exerciseFavorite.deleteMany({
            where: { id: { in: step.favoritesDropped.map((row) => BigInt(row.id)) } },
          });
        }
      }

      if (run.retired.length > 0) {
        await tx.exercise.updateMany({
          where: { publicId: { in: run.retired }, deletedAt: null },
          data: { deletedAt: appliedAt },
        });
      }
      if (dropped.length > 0) {
        await tx.exercise.updateMany({
          where: { source: 'curated', sourceId: { in: dropped }, deletedAt: null },
          data: { deletedAt: appliedAt },
        });
      }
    },
    { timeout: 600_000, maxWait: 30_000 },
  );

  console.log(`Applied. Run file (for undo): ${runFile}`);
}

async function undo(runPath: string) {
  const run = JSON.parse(await readFile(runPath, 'utf8')) as CurateRun;
  if (run.kind !== 'catalog-curate') {
    throw new Error(`${runPath} is not a catalog curate run file`);
  }
  const catalog = new Map(loadCatalog().map((entry) => [entry.slug, entry]));
  const kept: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      for (const step of [...run.carryOver].reverse()) {
        const original = await tx.exercise.findUnique({
          where: { publicId: step.from },
          select: { id: true },
        });
        if (!original) {
          kept.push(`"${step.fromName}" no longer exists; its rows stay on ${step.to}`);
          continue;
        }
        await tx.workoutExercise.updateMany({
          where: { id: { in: step.workoutExerciseIds.map(BigInt) } },
          data: { exerciseId: original.id },
        });
        for (const row of step.routineExercises) {
          await tx.routineExercise.updateMany({
            where: { id: BigInt(row.id) },
            data: { exerciseId: original.id, exerciseName: row.exerciseName },
          });
        }
        await tx.exerciseFavorite.updateMany({
          where: { id: { in: step.favoritesMoved.map(BigInt) } },
          data: { exerciseId: original.id },
        });
        for (const favorite of step.favoritesDropped) {
          await tx.exerciseFavorite.upsert({
            where: { userId_exerciseId: { userId: BigInt(favorite.userId), exerciseId: original.id } },
            create: { userId: BigInt(favorite.userId), exerciseId: original.id },
            update: {},
          });
        }
      }

      await tx.exercise.updateMany({
        where: { publicId: { in: run.retired } },
        data: { deletedAt: null },
      });
      await tx.exercise.updateMany({
        where: { source: 'curated', sourceId: { in: run.droppedCurated } },
        data: { deletedAt: null },
      });
      if (run.restored.length > 0) {
        await tx.exercise.updateMany({
          where: { source: 'curated', sourceId: { in: run.restored } },
          data: { deletedAt: new Date(run.appliedAt) },
        });
      }

      for (const update of run.updated) {
        const before = update.before;
        const entry = catalog.get(update.slug);
        const musclesChanged = 'primary' in before || 'secondary' in before;
        await tx.exercise.update({
          where: { source_sourceId: { source: 'curated', sourceId: update.slug } },
          data: {
            ...scalarData(before),
            ...(musclesChanged && entry
              ? {
                  primaryMuscleGroupLinks: {
                    deleteMany: {},
                    ...muscleLinks({ primary: before.primary ?? entry.primary, secondary: [] }).primaryMuscleGroupLinks,
                  },
                  secondaryMuscleGroupLinks: {
                    deleteMany: {},
                    ...muscleLinks({ primary: [], secondary: before.secondary ?? entry.secondary }).secondaryMuscleGroupLinks,
                  },
                }
              : {}),
          },
        });
      }

      for (const slug of run.created) {
        const exercise = await tx.exercise.findUnique({
          where: { source_sourceId: { source: 'curated', sourceId: slug } },
          select: { id: true, _count: { select: { workoutExercises: true, routineExercises: true } } },
        });
        if (!exercise) {
          continue;
        }
        if (exercise._count.workoutExercises + exercise._count.routineExercises > 0) {
          // Used since the run: retired, never deleted with its history.
          await tx.exercise.update({ where: { id: exercise.id }, data: { deletedAt: new Date() } });
          kept.push(`${slug} is used by workouts or routines saved since; retired instead of deleted`);
        } else {
          await tx.exercise.delete({ where: { id: exercise.id } });
        }
      }
    },
    { timeout: 600_000, maxWait: 30_000 },
  );

  for (const line of kept) {
    console.log(`Left: ${line}`);
  }
  console.log(`Undone: ${runPath}. New muscle groups are kept (harmless).`);
}

async function main() {
  if (process.env.CURATE_MODE === 'undo') {
    const runPath = process.env.CURATE_UNDO;
    if (!runPath) {
      throw new Error('Set CURATE_UNDO to the run file to undo');
    }
    await undo(runPath);
    return;
  }

  const catalog = loadCatalog();
  const problems = validateCatalog(catalog);
  if (problems.length > 0) {
    throw new Error(`The reviewed catalog has problems:\n${problems.join('\n')}`);
  }

  const carryOverMap = await loadCarryOverMap();
  const state = await readState(carryOverMap);
  const plan = normaliseMuscleOrder(planCurate({ catalog, carryOverMap, ...state }));
  const dropped = droppedCurated(catalog, state.curated);
  printReport(plan, dropped);

  if (process.env.CURATE_APPLY === 'true') {
    await apply(plan, dropped);
  } else {
    console.log('Report only. Apply with CURATE_APPLY=true after a backup.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
