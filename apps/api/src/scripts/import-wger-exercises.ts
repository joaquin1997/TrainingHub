import { fetchAllWgerExerciseInfos, fetchAllWgerLanguages } from '../features/exercises/importers/wger/client.js';
import { exportExercisesToCsv } from '../features/exercises/importers/wger/csv.js';
import { mapWgerExerciseToImportedRecord } from '../features/exercises/importers/wger/map.js';
import { upsertImportedExercises } from '../features/exercises/importers/wger/persistence.js';

const DEFAULT_CSV_OUTPUT_PATH = 'tmp/wger-exercises-es.csv';

function getCsvOutputPath() {
  const csvArg = process.argv.find((argument) =>
    argument.startsWith('--csv='),
  );

  if (csvArg) {
    return csvArg.slice('--csv='.length);
  }

  return process.env.CSV_OUTPUT_PATH ?? DEFAULT_CSV_OUTPUT_PATH;
}

async function main() {
  const csvOutputPath = getCsvOutputPath();
  const shouldImportToDatabase = process.env.IMPORT_TO_DB === 'true';

  console.log('Fetching languages from wger...');
  const languages = await fetchAllWgerLanguages();

  console.log('Fetching exercises from wger...');
  const exerciseInfos = await fetchAllWgerExerciseInfos();

  const exercises = exerciseInfos
    .map((exercise) => mapWgerExerciseToImportedRecord(exercise, languages))
    .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise));

  console.log(`Fetched and normalized ${exercises.length} exercises.`);

  await exportExercisesToCsv(exercises, csvOutputPath);
  console.log(`CSV exported to ${csvOutputPath}`);

  if (shouldImportToDatabase) {
    console.log('Upserting exercises into the database...');
    await upsertImportedExercises(exercises);
    console.log(`Imported ${exercises.length} exercises into the database.`);
  } else {
    console.log('Database import skipped. Set IMPORT_TO_DB=true to enable it.');
  }
}

main().catch((error) => {
  console.error('wger exercise import failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
