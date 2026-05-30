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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

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
