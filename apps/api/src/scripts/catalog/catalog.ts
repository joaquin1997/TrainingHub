import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATALOG_CATEGORIES,
  CATALOG_EQUIPMENT,
  CATALOG_LOADING_KINDS,
  CATALOG_MUSCLES,
  CATALOG_TRACKING_TYPES,
  type CatalogEntry,
} from './vocabulary.js';

/** Where the reviewed catalog lives, from `src/` or from the built `dist/`. */
function catalogDirectory(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../data/catalog'),
    join(here, '../../../../../src/scripts/data/catalog'),
  ];
  for (const candidate of candidates) {
    try {
      readdirSync(candidate);
      return candidate;
    } catch {
      // try the next location
    }
  }
  throw new Error('Reviewed catalog not found');
}

/** Every reviewed exercise, file by file in name order (spec 0044). */
export function loadCatalog(directory = catalogDirectory()): CatalogEntry[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => JSON.parse(readFileSync(join(directory, file), 'utf8')) as CatalogEntry[]);
}

/** Lower case, no accents, single spaces: how names are compared. */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const WEIGHT_TRACKING = new Set(['weight_reps', 'weight_duration']);

/**
 * What is wrong with the catalog, one line per problem (spec 0044 FR-1,
 * FR-4); empty when it is fine.
 */
export function validateCatalog(entries: CatalogEntry[]): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  const names = new Map<string, string>();

  const inside = <T extends string>(values: readonly T[], value: string) =>
    (values as readonly string[]).includes(value);

  for (const entry of entries) {
    const at = entry.slug ?? '(no slug)';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.slug ?? '')) {
      problems.push(`${at}: slug must be kebab-case`);
    }
    if (slugs.has(entry.slug)) {
      problems.push(`${at}: duplicate slug`);
    }
    slugs.add(entry.slug);

    for (const [language, name] of [
      ['es', entry.es],
      ['en', entry.en],
    ] as const) {
      if (!name?.trim()) {
        problems.push(`${at}: missing ${language} name`);
        continue;
      }
      const key = `${language}:${normaliseName(name)}`;
      const other = names.get(key);
      if (other) {
        problems.push(`${at}: ${language} name "${name}" also used by ${other}`);
      }
      names.set(key, entry.slug);
    }

    if (!inside(CATALOG_CATEGORIES, entry.category)) {
      problems.push(`${at}: unknown category ${entry.category}`);
    }
    if (!entry.primary?.length) {
      problems.push(`${at}: needs a primary muscle`);
    }
    for (const muscle of [...(entry.primary ?? []), ...(entry.secondary ?? [])]) {
      if (!inside(CATALOG_MUSCLES, muscle)) {
        problems.push(`${at}: unknown muscle ${muscle}`);
      }
    }
    if ((entry.secondary ?? []).some((muscle) => entry.primary?.includes(muscle))) {
      problems.push(`${at}: a muscle is both primary and secondary`);
    }
    if (!entry.equipment?.length) {
      problems.push(`${at}: needs equipment`);
    }
    for (const item of entry.equipment ?? []) {
      if (!inside(CATALOG_EQUIPMENT, item)) {
        problems.push(`${at}: unknown equipment ${item}`);
      }
    }
    if (!inside(CATALOG_TRACKING_TYPES, entry.trackingType)) {
      problems.push(`${at}: unknown tracking type ${entry.trackingType}`);
    }
    const recordsWeight = WEIGHT_TRACKING.has(entry.trackingType);
    if (recordsWeight && !entry.loadingKind) {
      problems.push(`${at}: records weight, needs a loading kind`);
    }
    if (!recordsWeight && entry.loadingKind) {
      problems.push(`${at}: records no weight, must have no loading kind`);
    }
    if (entry.loadingKind && !inside(CATALOG_LOADING_KINDS, entry.loadingKind)) {
      problems.push(`${at}: unknown loading kind ${entry.loadingKind}`);
    }
    if (typeof entry.unilateral !== 'boolean') {
      problems.push(`${at}: unilateral must be true or false`);
    }
  }

  return problems;
}
