import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fetchAllWgerExerciseInfos,
} from '../features/exercises/importers/wger/client.js';
import { prisma } from '../infrastructure/prisma.js';

import { type FreeExercise, matchImages, suggestDatasetName } from './matchImages.js';

/**
 * Fills `Exercise.imageUrl` for catalog (wger) exercises that have none, from
 * free-exercise-db (public domain), matching by name.
 *
 * Safe by construction: it only sets imageUrl where it is still empty (the
 * update itself is conditional), so it never replaces a wger image or one a
 * person set, never touches custom exercises and never deletes anything.
 * Re-running it is harmless. Dry run unless IMPORT_TO_DB=true.
 *
 * Hand-reviewed aliases live in src/scripts/data/free-exercise-db-aliases.json
 * ({ "<catalog name>": "<free-exercise-db name>" }).
 */

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const DEFAULT_CSV = 'tmp/free-exercise-db-matches.csv';

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function loadAliases(): Promise<Record<string, string>> {
  // dist/apps/api/src/scripts -> apps/api/src/scripts/data (also valid from src/).
  const candidates = [
    new URL('./data/free-exercise-db-aliases.json', import.meta.url),
    new URL(
      '../../../../../src/scripts/data/free-exercise-db-aliases.json',
      import.meta.url,
    ),
  ];

  for (const url of candidates) {
    try {
      return JSON.parse(await readFile(fileURLToPath(url), 'utf8')) as Record<
        string,
        string
      >;
    } catch {
      // try the next location
    }
  }

  return {};
}

async function main() {
  const write = process.env.IMPORT_TO_DB === 'true';
  const csvPath = process.env.CSV_OUTPUT_PATH ?? DEFAULT_CSV;

  console.log('Fetching free-exercise-db...');
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Dataset request failed with status ${response.status}`);
  }
  const dataset = (await response.json()) as FreeExercise[];

  const candidates = await prisma.exercise.findMany({
    where: { source: 'wger', isSystemDefined: true, imageUrl: null },
    select: { id: true, name: true, sourceId: true },
  });

  // The catalog stores one language per exercise (mostly Spanish); wger also
  // has the English names, which is what free-exercise-db uses.
  console.log('Fetching wger translations...');
  const altNamesBySourceId = new Map<string, string[]>();
  for (const info of await fetchAllWgerExerciseInfos()) {
    altNamesBySourceId.set(
      String(info.id),
      (info.translations ?? [])
        .map((translation) => translation.name)
        .filter((name): name is string => Boolean(name)),
    );
  }

  const { matched, unmatched } = matchImages(
    candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      altNames: altNamesBySourceId.get(candidate.sourceId),
    })),
    dataset,
    await loadAliases(),
  );

  const rows = [
    'status,catalog_name,matched_name,image_url,suggestion',
    ...matched.map((m) =>
      ['matched', m.name, m.matchedName, m.imageUrl, ''].map(csvCell).join(','),
    ),
    ...unmatched.map((e) => {
      // Not applied: a hint for filling the alias file by hand.
      const hint = suggestDatasetName([e.name, ...(e.altNames ?? [])], dataset);
      return [
        'unmatched',
        e.name,
        '',
        '',
        hint && hint.score >= 0.6 ? `${hint.name} (${hint.score.toFixed(2)})` : '',
      ]
        .map(csvCell)
        .join(',');
    }),
  ];
  await mkdir(dirname(csvPath), { recursive: true });
  await writeFile(csvPath, `${rows.join('\n')}\n`);

  console.log(
    `${candidates.length} catalog exercises without image: ${matched.length} matched, ${unmatched.length} unmatched. Report: ${csvPath}`,
  );

  if (!write) {
    console.log('Dry run: nothing written. Set IMPORT_TO_DB=true to apply.');
    return;
  }

  let updated = 0;
  for (const match of matched) {
    const result = await prisma.exercise.updateMany({
      where: { id: match.id, imageUrl: null },
      data: { imageUrl: match.imageUrl },
    });
    updated += result.count;
  }
  console.log(`Set imageUrl on ${updated} exercises.`);
}

main()
  .catch((error) => {
    console.error('free-exercise-db image matching failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
