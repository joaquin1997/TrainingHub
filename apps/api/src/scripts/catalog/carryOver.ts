import { normaliseName } from './catalog.js';
import type { CatalogEntry } from './vocabulary.js';

/** An exercise from the old catalog, or a custom one, that something uses. */
export interface OldExercise {
  id: string;
  name: string;
  source: string;
}

export type CarryOverConfidence = 'exact' | 'probable' | 'none';

export interface CarryOverProposal extends OldExercise {
  slug?: string;
  /** The reviewed exercise's Spanish name, for the owner's list. */
  proposedName?: string;
  confidence: CarryOverConfidence;
  score: number;
}

const STOPWORDS = new Set([
  'a', 'al', 'and', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'of', 'on',
  'para', 'por', 'the', 'with', 'y',
]);

/**
 * A rough singular, the same on both sides: "elevaciones" and "elevación",
 * "raises" and "raise", "curls" and "curl" meet.
 */
function stem(word: string): string {
  const bare = word.replace(/s+$/, '');
  return bare.length > 3 && bare.endsWith('e') ? bare.slice(0, -1) : bare;
}

/** Words of a name, without stopwords, singular-ish (spec 0044 task 5). */
function words(name: string): Set<string> {
  return new Set(
    normaliseName(name)
      .split(' ')
      .filter((word) => word && !STOPWORDS.has(word))
      .map(stem),
  );
}

function similarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const word of left) {
    if (right.has(word)) {
      shared += 1;
    }
  }
  return shared / (left.size + right.size - shared);
}

/** Below this a match is not proposed at all (EF-3: never guessed). */
const PROBABLE_FROM = 0.5;

/**
 * The reviewed exercise each old one most likely is (spec 0044 FR-6): the
 * same name in either language or a search name → exact; enough words in
 * common → probable, for the owner to confirm; otherwise none. Pure.
 */
export function proposeCarryOver(
  oldExercises: OldExercise[],
  catalog: CatalogEntry[],
): CarryOverProposal[] {
  const exact = new Map<string, CatalogEntry>();
  for (const entry of catalog) {
    for (const name of [entry.es, entry.en, ...entry.aliases]) {
      const key = normaliseName(name);
      if (!exact.has(key)) {
        exact.set(key, entry);
      }
    }
  }
  const named = catalog.flatMap((entry) =>
    [entry.es, entry.en, ...entry.aliases].map((name) => ({ entry, words: words(name) })),
  );

  return oldExercises.map((old) => {
    const hit = exact.get(normaliseName(old.name));
    if (hit) {
      return { ...old, slug: hit.slug, proposedName: hit.es, confidence: 'exact', score: 1 };
    }

    const oldWords = words(old.name);
    let best: { entry: CatalogEntry; score: number } | null = null;
    for (const candidate of named) {
      const score = similarity(oldWords, candidate.words);
      if (!best || score > best.score) {
        best = { entry: candidate.entry, score };
      }
    }
    if (best && best.score >= PROBABLE_FROM) {
      return {
        ...old,
        slug: best.entry.slug,
        proposedName: best.entry.es,
        confidence: 'probable',
        score: Math.round(best.score * 100) / 100,
      };
    }
    return { ...old, confidence: 'none', score: best ? Math.round(best.score * 100) / 100 : 0 };
  });
}
