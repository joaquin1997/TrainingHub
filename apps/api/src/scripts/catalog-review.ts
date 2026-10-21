import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadCatalog, validateCatalog } from './catalog/catalog.js';
import { reviewTable } from './catalog/reviewTables.js';
import type { CatalogEntry } from './catalog/vocabulary.js';

/**
 * Writes the review tables of the reviewed catalog (spec 0044 task 4), one
 * markdown file per data file, to REVIEW_DIR (default: the spec's review/).
 * Reads only the repo; touches no database.
 */
const TITLES: Record<string, string> = {
  arms: 'Brazos',
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  core: 'Core',
  'full-body': 'Cuerpo completo',
  legs: 'Piernas y gemelos',
  shoulders: 'Hombros',
};

const problems = validateCatalog(loadCatalog());
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const dataDir = new URL('../../../../../src/scripts/data/catalog/', import.meta.url);
const outDir = process.env.REVIEW_DIR ?? '../../docs/sdd/specs/0044-curated-exercise-catalog/review';
mkdirSync(outDir, { recursive: true });

for (const file of readdirSync(dataDir).filter((name) => name.endsWith('.json')).sort()) {
  const group = file.replace(/\.json$/, '');
  const entries = JSON.parse(readFileSync(new URL(file, dataDir), 'utf8')) as CatalogEntry[];
  writeFileSync(join(outDir, `${group}.md`), reviewTable(TITLES[group] ?? group, entries));
  console.log(`${group}: ${entries.length}`);
}
