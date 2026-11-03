import i18n from 'i18next';

import { API_BASE_URL } from '@/config/api';

type ErrorResponse = {
  message?: string;
};

/** A non-2xx answer from the API, with its status (network failures stay plain errors). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The parsed JSON error body, for callers that need more than the message. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Whether retrying cannot help: the server understood the request and refused
 * it (4xx), other than for the session (401), a timeout (408) or rate limiting
 * (429). Network failures and 5xx are worth retrying.
 */
export function isPermanentRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 408, 429].includes(error.status)
  );
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set (or clear) the bearer token sent with every request. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** The bearer token currently sent with requests (for image loads that bypass fetch). */
export function getAuthToken() {
  return authToken;
}

/** Register a callback fired when the API returns 401 (e.g. to sign out). */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/**
 * Shared fetch wrapper for the API clients: sets JSON content-type on writes,
 * handles 204 responses, and throws ApiError(message, status) on non-2xx responses.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options: { notifyUnauthorized?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  if (!options.timeoutMs) return performApiRequest<T>(path, init, options);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      performApiRequest<T>(path, { ...init, signal: controller.signal }, options),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Request timed out'));
        }, options.timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function performApiRequest<T>(
  path: string,
  init: RequestInit | undefined,
  options: { notifyUnauthorized?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const requestToken = authToken;
  if (requestToken) {
    headers.set('Authorization', `Bearer ${requestToken}`);
  }

  // Catalog names come back in the app's language (spec 0044 FR-2).
  if (!headers.has('Accept-Language') && i18n.language) {
    headers.set('Accept-Language', i18n.language);
  }

  const url = `${API_BASE_URL}${path}`;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[api] ${init?.method ?? 'GET'} ${url}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(
        `[api] FETCH FAILED ${init?.method ?? 'GET'} ${url} ->`,
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      );
    }
    throw error;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[api] ${response.status} ${init?.method ?? 'GET'} ${url}`);
  }

  if (response.status === 401 && options.notifyUnauthorized !== false &&
      requestToken !== null && requestToken === authToken) {
    onUnauthorized?.();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = (await response.json().catch(() => null)) as
    | T
    | ErrorResponse
    | null;

  if (!response.ok) {
    const message =
      responseBody &&
      typeof responseBody === 'object' &&
      'message' in responseBody &&
      typeof responseBody.message === 'string'
        ? responseBody.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody as T;
}
