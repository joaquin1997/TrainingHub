import type { ExerciseTrackingType } from '@workout/domain';

import { prisma } from '../infrastructure/prisma.js';

/**
 * Gives a curated part of the wger catalog the tracking type it really has
 * (spec 0021): wger does not say whether an exercise is timed or measured by
 * distance, so every catalog exercise starts as weight & reps.
 *
 * Data, not schema (constitution art. 5): it only updates rows that are still
 * `weight_reps`, so it is idempotent, never overrides a later choice and
 * never deletes anything. Ids missing on a database are reported and skipped.
 * Keys are wger `sourceId`s from the 2026-10 export.
 */
const CURATED_TRACKING_TYPES: Record<
  Exclude<ExerciseTrackingType, 'weight_reps'>,
  Record<string, string>
> = {
  duration: {
    '1307': 'Front Plank',
    '458': 'Plancha de antebrazo',
    '1001': 'Plancha Alta',
    '1019': 'Plancha de lado derecho',
    '580': 'Plancha de lado izquierdo',
    '500': 'Reverse Plank',
    '297': 'Hollow Hold',
    '382': 'L Hold',
    '1852': 'L-sit',
    '1847': 'Straddle L-Sit',
    '1853': 'L-Sit (Foot Supported)',
    '1704': 'Tuck L-sit',
    '1408': 'Wall-sit',
    '1733': 'Sentadilla isometrica al fallo',
    '31': 'Sostenimiento Lateral Isométrico',
    '1101': 'Horizontal traction isometry',
    '1282': 'Isometria trazioni impugnatura inversa',
    '1537': 'Pull-up Isometric Hold',
    '1693': 'Incline Static Hold',
    '1808': 'Parallel Bar Hold',
    '1832': 'Ring Support Hold',
    '1914': 'Isometria alle parallele',
    '182': 'Suspensiones en Regleta',
    '820': 'Suspensión en regleta de 20 mm',
    '804': 'Suspensión en Romos',
    '993': 'Saltar la cuerda: saltos básicos',
    '595': 'Skipping - Standard',
    '1548': 'Stair Master',
  },
  weight_duration: {
    '1116': "Dumbbell farmer's carry",
    '1776': 'Suitcase Carry',
  },
  distance_duration: {
    '527': 'Run',
    '529': 'Run - Interval Training',
    '319': 'Jogging',
    '908': 'Carrera en Zona 2',
    '530': 'Correr en cinta',
    '1615': 'Cardio en cinta',
    '1104': 'Walking',
    '1093': 'Rowing Machine',
    '177': 'Ciclismo',
    '624': 'Stationary Bike',
    '1376': 'Recumbent Bike',
    '1204': 'Cycling cardio session',
    '1618': 'Cardio en bicicleta estática',
    '962': 'La Elíptica',
  },
  reps: {},
};

async function main() {
  let updated = 0;
  const missing: string[] = [];

  for (const [trackingType, entries] of Object.entries(CURATED_TRACKING_TYPES)) {
    for (const [sourceId, name] of Object.entries(entries)) {
      const exercise = await prisma.exercise.findUnique({
        where: { source_sourceId: { source: 'wger', sourceId } },
        select: { id: true },
      });

      if (!exercise) {
        missing.push(`${sourceId} (${name})`);
        continue;
      }

      const result = await prisma.exercise.updateMany({
        where: { id: exercise.id, trackingType: 'weight_reps' },
        data: { trackingType },
      });
      updated += result.count;
    }
  }

  console.log(`Tracking type set on ${updated} catalog exercises.`);
  if (missing.length > 0) {
    console.log(`Not in this database (skipped): ${missing.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error('Setting catalog tracking types failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
