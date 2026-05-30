import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ImportedExerciseRecord } from './types.js';

function escapeCsvValue(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function toCsvRow(values: Array<string | undefined>) {
  return values.map((value) => escapeCsvValue(value ?? '')).join(',');
}

export async function exportExercisesToCsv(
  exercises: ImportedExerciseRecord[],
  outputPath: string,
) {
  await mkdir(dirname(outputPath), { recursive: true });

  const header = toCsvRow([
    'source',
    'sourceId',
    'name',
    'description',
    'language',
    'category',
    'primaryMuscles',
    'secondaryMuscles',
    'equipment',
    'licenseAuthor',
    'lastUpdate',
  ]);

  const rows = exercises.map((exercise) =>
    toCsvRow([
      exercise.source,
      exercise.sourceId,
      exercise.name,
      exercise.description,
      exercise.language,
      exercise.category,
      exercise.primaryMuscles.join('|'),
      exercise.secondaryMuscles.join('|'),
      exercise.equipment.join('|'),
      exercise.licenseAuthor,
      exercise.lastUpdate,
    ]),
  );

  await writeFile(outputPath, [header, ...rows].join('\n'), 'utf8');
}
