import { prisma } from '../infrastructure/prisma.js';

import { CURATED_TRACKING_TYPES } from './trackingTypeSweep/curated.js';

/**
 * Gives a curated part of the wger catalog the tracking type it really has
 * (spec 0021): wger does not say whether an exercise is timed or measured by
 * distance, so every catalog exercise starts as weight & reps.
 *
 * Data, not schema (constitution art. 5): it only updates rows that are still
 * `weight_reps`, so it is idempotent, never overrides a later choice and
 * never deletes anything. Ids missing on a database are reported and skipped.
 * Keys are wger `sourceId`s from the 2026-10 export.
 *
 * Superseded by the tracking type sweep (spec 0030, `sweep-tracking-types.ts`),
 * which treats this list as an override; the list now lives in
 * `trackingTypeSweep/curated.ts`. Running this script is still harmless.
 */
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
        // Never a type a person set by hand (spec 0030 FR-6).
        where: { id: exercise.id, trackingType: 'weight_reps', trackingTypeSetBy: 'system' },
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
