export interface ExerciseBlockLabel {
  /** "1", "2A", "2B", "3"… */
  label: string;
  /** Position inside a superset run; `none` for a standalone exercise. */
  superset: 'none' | 'start' | 'middle' | 'end';
  /** Superset number as shown to the person (1-based), when in one. */
  supersetIndex?: number;
}

/**
 * Numbers the exercises of a routine or workout as blocks (spec 0017 FR-14):
 * a run of consecutive exercises sharing a `supersetGroup` (two or more) is one
 * block with letters — 2A, 2B — and every other exercise is its own block.
 * The same group number appearing again later starts a new run.
 */
export function exerciseBlockLabels(
  exercises: ReadonlyArray<{ supersetGroup?: number }>,
): ExerciseBlockLabel[] {
  const labels: ExerciseBlockLabel[] = [];
  let block = 0;
  let supersets = 0;
  let index = 0;

  while (index < exercises.length) {
    const group = exercises[index]?.supersetGroup;
    let runEnd = index + 1;
    if (group !== undefined) {
      while (runEnd < exercises.length && exercises[runEnd]?.supersetGroup === group) {
        runEnd += 1;
      }
    }

    block += 1;
    const runLength = runEnd - index;
    if (runLength < 2) {
      labels.push({ label: String(block), superset: 'none' });
    } else {
      supersets += 1;
      for (let offset = 0; offset < runLength; offset += 1) {
        labels.push({
          label: `${block}${String.fromCharCode(65 + offset)}`,
          superset: offset === 0 ? 'start' : offset === runLength - 1 ? 'end' : 'middle',
          supersetIndex: supersets,
        });
      }
    }
    index = runEnd;
  }

  return labels;
}
