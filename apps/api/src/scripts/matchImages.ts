/**
 * Name matching between the catalog and free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, Unlicense / public domain:
 * no attribution required; hosting through the raw GitHub URL is the use its
 * README documents).
 */

export const FREE_EXERCISE_DB_IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export type FreeExercise = { name: string; images: string[] };

/** `altNames`: other names of the same exercise (e.g. its wger translations). */
export type CatalogExercise = { id: bigint; name: string; altNames?: string[] };

export type ImageMatch = {
  id: bigint;
  name: string;
  matchedName: string;
  imageUrl: string;
};

/** Lower case, no accents or punctuation, single spaces, naive singular per word. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      word.length > 3 && word.endsWith('s') && !word.endsWith('ss')
        ? word.slice(0, -1)
        : word,
    )
    .join(' ');
}

export function imageUrlFor(path: string): string {
  return `${FREE_EXERCISE_DB_IMAGE_BASE}${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

/**
 * Matches catalog exercises to free-exercise-db entries by exact normalised
 * name, or through a hand-reviewed alias (catalog name -> dataset name).
 * Entries without images and ambiguous dataset names never match.
 */
export function matchImages(
  catalog: CatalogExercise[],
  dataset: FreeExercise[],
  aliases: Record<string, string> = {},
): { matched: ImageMatch[]; unmatched: CatalogExercise[] } {
  const byName = new Map<string, FreeExercise | null>();

  for (const entry of dataset) {
    if (!entry.images[0]) {
      continue;
    }
    const key = normalizeName(entry.name);
    byName.set(key, byName.has(key) ? null : entry);
  }

  const aliasByName = new Map(
    Object.entries(aliases).map(([from, to]) => [
      normalizeName(from),
      normalizeName(to),
    ]),
  );

  const matched: ImageMatch[] = [];
  const unmatched: CatalogExercise[] = [];

  for (const exercise of catalog) {
    const keys = [exercise.name, ...(exercise.altNames ?? [])].map(normalizeName);
    const entry = keys
      .map((key) => byName.get(aliasByName.get(key) ?? key))
      .find((candidate) => Boolean(candidate));
    const first = entry?.images[0];

    if (entry && first) {
      matched.push({
        id: exercise.id,
        name: exercise.name,
        matchedName: entry.name,
        imageUrl: imageUrlFor(first),
      });
    } else {
      unmatched.push(exercise);
    }
  }

  return { matched, unmatched };
}

function tokens(name: string) {
  return new Set(normalizeName(name).split(' ').filter(Boolean));
}

/**
 * Review aid, never applied: the dataset name sharing most words with any of
 * the exercise's names (Jaccard on words), with its score.
 */
export function suggestDatasetName(
  names: string[],
  dataset: FreeExercise[],
): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;

  for (const name of names) {
    const own = tokens(name);
    for (const entry of dataset) {
      if (!entry.images[0]) {
        continue;
      }
      const other = tokens(entry.name);
      const shared = [...own].filter((word) => other.has(word)).length;
      const score = shared / (own.size + other.size - shared || 1);
      if (score > (best?.score ?? 0)) {
        best = { name: entry.name, score };
      }
    }
  }

  return best;
}
