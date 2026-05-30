import type {
  WgerExerciseInfo,
  WgerLanguage,
  WgerPaginatedResponse,
} from './types.js';

const DEFAULT_WGER_API_BASE_URL = 'https://wger.de/api/v2';
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_WGER_AUTH_TOKEN = '88f1dcd8f6ecbf61e5422cf14722c71d7d24ce75';

function getWgerApiBaseUrl() {
  return process.env.WGER_API_BASE_URL ?? DEFAULT_WGER_API_BASE_URL;
}

function buildHeaders() {
  const headers = new Headers({
    Accept: 'application/json',
  });

  const authToken = process.env.WGER_AUTH_TOKEN ?? DEFAULT_WGER_AUTH_TOKEN;

  if (authToken) {
    headers.set('Authorization', `Token ${authToken}`);
  }

  return headers;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`wger request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchPaginated<T>(url: string) {
  const records: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const page: WgerPaginatedResponse<T> = await fetchJson(nextUrl);
    records.push(...page.results);
    nextUrl = page.next;
  }

  return records;
}

export async function fetchAllWgerLanguages() {
  const pageSize = Number.parseInt(process.env.WGER_PAGE_SIZE ?? '', 10);
  const limit = Number.isFinite(pageSize) && pageSize > 0
    ? pageSize
    : DEFAULT_PAGE_SIZE;

  return fetchPaginated<WgerLanguage>(
    `${getWgerApiBaseUrl()}/language/?limit=${limit}`,
  );
}

export async function fetchAllWgerExerciseInfos() {
  const pageSize = Number.parseInt(process.env.WGER_PAGE_SIZE ?? '', 10);
  const limit = Number.isFinite(pageSize) && pageSize > 0
    ? pageSize
    : DEFAULT_PAGE_SIZE;

  return fetchPaginated<WgerExerciseInfo>(
    `${getWgerApiBaseUrl()}/exerciseinfo/?limit=${limit}`,
  );
}
