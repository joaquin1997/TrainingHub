import type {
  ImportedExerciseRecord,
  WgerExerciseInfo,
  WgerLanguage,
} from './types.js';

function stripHtml(value?: string) {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function dedupe(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function buildLanguageMaps(languages: WgerLanguage[]) {
  const languageCodeById = new Map<number, string>();
  const spanishLanguageIds = new Set<number>();
  const englishLanguageIds = new Set<number>();

  for (const language of languages) {
    const code =
      language.short_name?.toLowerCase() ??
      language.full_name?.toLowerCase() ??
      language.full_name_en?.toLowerCase() ??
      '';

    if (code) {
      languageCodeById.set(language.id, code);
    }

    if (
      code === 'es' ||
      code.startsWith('es-') ||
      language.full_name?.toLowerCase().includes('spanish') ||
      language.full_name_en?.toLowerCase().includes('spanish')
    ) {
      spanishLanguageIds.add(language.id);
    }

    if (
      code === 'en' ||
      code.startsWith('en-') ||
      language.full_name?.toLowerCase().includes('english') ||
      language.full_name_en?.toLowerCase().includes('english')
    ) {
      englishLanguageIds.add(language.id);
    }
  }

  return {
    languageCodeById,
    spanishLanguageIds,
    englishLanguageIds,
  };
}

function pickPreferredTranslation(
  exercise: WgerExerciseInfo,
  languages: WgerLanguage[],
) {
  const { languageCodeById, spanishLanguageIds, englishLanguageIds } =
    buildLanguageMaps(languages);
  const translations = exercise.translations ?? [];

  const spanishBaseTranslation = translations.find((translation) => {
    const code = translation.language
      ? languageCodeById.get(translation.language)
      : undefined;

    return code === 'es';
  });

  if (spanishBaseTranslation) {
    return {
      translation: spanishBaseTranslation,
      language: 'es',
    };
  }

  const spanishTranslation = translations.find((translation) =>
    translation.language ? spanishLanguageIds.has(translation.language) : false,
  );

  if (spanishTranslation) {
    return {
      translation: spanishTranslation,
      language: spanishTranslation.language
        ? languageCodeById.get(spanishTranslation.language)
        : undefined,
    };
  }

  const englishTranslation = translations.find((translation) =>
    translation.language ? englishLanguageIds.has(translation.language) : false,
  );

  if (englishTranslation) {
    return {
      translation: englishTranslation,
      language: englishTranslation.language
        ? languageCodeById.get(englishTranslation.language)
        : undefined,
    };
  }

  const firstTranslation = translations[0];

  return {
    translation: firstTranslation,
    language:
      firstTranslation?.language !== undefined
        ? languageCodeById.get(firstTranslation.language)
        : undefined,
  };
}

export function mapWgerExerciseToImportedRecord(
  exercise: WgerExerciseInfo,
  languages: WgerLanguage[],
): ImportedExerciseRecord | null {
  const { translation, language } = pickPreferredTranslation(exercise, languages);
  const name = translation?.name?.trim();

  if (!name) {
    return null;
  }

  const images = exercise.images ?? [];
  const imageUrl =
    images.find((image) => image.is_main)?.image?.trim() ||
    images.find((image) => image.image?.trim())?.image?.trim() ||
    undefined;

  return {
    source: 'wger',
    sourceId: String(exercise.id),
    name,
    description: stripHtml(translation?.description),
    language,
    category: exercise.category?.name?.trim() || undefined,
    imageUrl,
    primaryMuscles: dedupe(
      (exercise.muscles ?? []).map((muscle) => muscle.name_en || muscle.name),
    ),
    secondaryMuscles: dedupe(
      (exercise.muscles_secondary ?? []).map((muscle) => muscle.name_en || muscle.name),
    ),
    equipment: dedupe((exercise.equipment ?? []).map((item) => item.name)),
    licenseAuthor:
      translation?.license_author?.trim() ||
      exercise.license_author?.trim() ||
      undefined,
    lastUpdate: exercise.last_update_global ?? exercise.last_update,
    isSystemDefined: true,
  };
}
