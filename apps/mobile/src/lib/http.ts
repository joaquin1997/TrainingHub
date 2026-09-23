import { API_BASE_URL } from '@/config/api';

type ErrorResponse = {
  message?: string;
};

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set (or clear) the bearer token sent with every request. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Register a callback fired when the API returns 401 (e.g. to sign out). */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/**
 * Shared fetch wrapper for the API clients: sets JSON content-type on writes,
 * handles 204 responses, and throws Error(message) on non-2xx responses.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
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

  if (response.status === 401) {
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

    throw new Error(message);
  }

  return responseBody as T;
}
