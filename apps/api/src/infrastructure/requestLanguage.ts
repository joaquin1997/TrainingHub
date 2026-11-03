import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The language the app asked for (spec 0044 FR-2), so catalog names are
 * picked in one place instead of threading a parameter through every
 * repository. Set once per request from `Accept-Language`; Spanish when the
 * header is missing or names another language (older apps send none).
 */
export type CatalogLanguage = 'es' | 'en';

const storage = new AsyncLocalStorage<CatalogLanguage>();

export function parseCatalogLanguage(header: string | string[] | undefined): CatalogLanguage {
  const value = Array.isArray(header) ? header[0] : header;
  const first = value?.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('en') ? 'en' : 'es';
}

/** Runs `next` with `language` as the request's language. */
export function runWithCatalogLanguage(language: CatalogLanguage, next: () => void) {
  storage.run(language, next);
}

export function currentCatalogLanguage(): CatalogLanguage {
  return storage.getStore() ?? 'es';
}

/**
 * An exercise's name in the request's language: the reviewed catalog's name
 * in that language, else the stored name (custom and older exercises).
 */
export function exerciseDisplayName(
  exercise: { name: string; nameEs?: string | null; nameEn?: string | null },
  language: CatalogLanguage = currentCatalogLanguage(),
): string {
  return (language === 'en' ? exercise.nameEn : exercise.nameEs) ?? exercise.name;
}
