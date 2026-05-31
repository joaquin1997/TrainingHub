import { API_BASE_URL } from '@/config/api';

type ErrorResponse = {
  message?: string;
};

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
