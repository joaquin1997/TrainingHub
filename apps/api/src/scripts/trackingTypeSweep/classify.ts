import type { ExerciseTrackingType } from '@workout/domain';

import { LOAD_EQUIPMENT, LOAD_NAME_WORDS, TRACKING_RULES, type TrackingRule } from './rules.js';

/**
 * Pure classifier of the tracking type sweep (spec 0030). No I/O: the script
 * fetches the wger translations and hands every name in.
 */

/** What the classifier reads about one catalog exercise. */
export type ClassifierInput = {
  sourceId: string;
  /** Stored name first, then every other-language name of the movement. */
  names: string[];
  category?: string | null;
  equipment?: string[];
};

/** Owner corrections, keyed by wger `sourceId` (FR-4). */
export type TrackingCorrections = Record<string, { type: ExerciseTrackingType; name?: string }>;

export type Classification = {
  type: ExerciseTrackingType;
  /** Which correction, list or rule decided it, for the report. */
  reason: string;
  certain: boolean;
};

export type ClassifierOverrides = {
  corrections?: TrackingCorrections;
  /** Spec 0021's hand-picked list (`curated.ts`). */
  curated?: Map<string, ExerciseTrackingType>;
};

/** Lower case, no accents, `ß` -> `ss`, anything but letters and digits -> one space. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const keywordCache = new Map<string, RegExp>();

/** A keyword as a whole-word pattern; `*` at a word's start or end = any letters. */
function keywordPattern(keyword: string): RegExp {
  const cached = keywordCache.get(keyword);
  if (cached) {
    return cached;
  }

  const words = keyword
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const leading = word.startsWith('*');
      const trailing = word.endsWith('*') && word.length > 1;
      const core = normalizeText(word.replace(/\*/g, ''));
      return `${leading ? '[a-z0-9]*' : ''}${escapeRegExp(core)}${trailing ? '[a-z0-9]*' : ''}`;
    });
  const pattern = new RegExp(`(?:^| )${words.join(' ')}(?= |$)`);
  keywordCache.set(keyword, pattern);
  return pattern;
}

/** The first keyword found in one of the (normalised) names, with that name. */
function findKeyword(
  normalizedNames: string[],
  keywords: string[],
): { keyword: string; name: string } | undefined {
  for (const keyword of keywords) {
    const pattern = keywordPattern(keyword);
    const name = normalizedNames.find((candidate) => pattern.test(candidate));
    if (name !== undefined) {
      return { keyword, name };
    }
  }
  return undefined;
}

/** Loaded: lifting equipment, or a name that says cable, machine, weighted… */
export function isLoaded(input: ClassifierInput): boolean {
  const equipment = (input.equipment ?? []).map(normalizeText);
  return (
    findKeyword(equipment, LOAD_EQUIPMENT) !== undefined ||
    findKeyword(input.names.map(normalizeText), LOAD_NAME_WORDS) !== undefined
  );
}

function ruleApplies(
  rule: TrackingRule,
  normalizedNames: string[],
  loaded: boolean,
): { keyword: string; name: string } | undefined {
  if (rule.notWhenLoaded && loaded) {
    return undefined;
  }
  const hit = findKeyword(normalizedNames, rule.keywords);
  if (!hit || (rule.exclude && findKeyword(normalizedNames, rule.exclude))) {
    return undefined;
  }
  return hit;
}

/**
 * Proposes a tracking type for one catalog exercise. First that applies:
 * owner correction, 0021 list, name rules (in `rules.ts` order), and else
 * weight & reps — certain for a loaded lift, uncertain otherwise (FR-3).
 */
export function classifyExercise(
  input: ClassifierInput,
  overrides: ClassifierOverrides = {},
): Classification {
  const correction = overrides.corrections?.[input.sourceId];
  if (correction) {
    return { type: correction.type, reason: 'owner correction', certain: true };
  }

  const curated = overrides.curated?.get(input.sourceId);
  if (curated) {
    return { type: curated, reason: '0021 list', certain: true };
  }

  const names = [...new Set(input.names.map(normalizeText).filter(Boolean))];
  const loaded = isLoaded(input);

  for (const rule of TRACKING_RULES) {
    const hit = ruleApplies(rule, names, loaded);
    if (hit) {
      return {
        type: rule.type,
        reason: `rule ${rule.id}: "${hit.keyword}" in "${hit.name}"`,
        certain: rule.certain,
      };
    }
  }

  if (loaded) {
    return { type: 'weight_reps', reason: 'no rule: loaded lift', certain: true };
  }

  const cardio = normalizeText(input.category ?? '') === 'cardio';
  return {
    type: 'weight_reps',
    reason: cardio ? 'no rule (category cardio: review)' : 'no rule',
    certain: false,
  };
}
