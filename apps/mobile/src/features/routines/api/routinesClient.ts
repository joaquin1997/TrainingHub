import type {
  CreateRoutineInput,
  Routine,
  UpdateRoutineInput,
} from '@workout/domain';

import { API_BASE_URL } from '@/config/api';

type ErrorResponse = {
  message?: string;
};

async function request<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const method = init?.method ?? 'GET';

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  console.log('[routinesClient] request', {
    method,
    url: `${API_BASE_URL}${path}`,
    body: init?.body,
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    console.log('[routinesClient] response', {
      method,
      url: `${API_BASE_URL}${path}`,
      status: response.status,
    });

    return undefined as T;
  }

  const responseBody = (await response.json().catch(() => null)) as
    | T
    | ErrorResponse
    | null;

  console.log('[routinesClient] response', {
    method,
    url: `${API_BASE_URL}${path}`,
    status: response.status,
    body: responseBody,
  });

  if (!response.ok) {
    const message =
      responseBody &&
      typeof responseBody === 'object' &&
      'message' in responseBody &&
      typeof responseBody.message === 'string'
        ? responseBody.message
        : `Request failed with status ${response.status}`;

    console.error('[routinesClient] error', {
      method,
      url: `${API_BASE_URL}${path}`,
      status: response.status,
      message,
      body: responseBody,
    });

    throw new Error(message);
  }

  return responseBody as T;
}

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const routinesClient = {
  list() {
    return request<Routine[]>('/routines');
  },
  getById(routineId: string) {
    return request<Routine>(`/routines/${routineId}`);
  },
  create(input: CreateRoutineInput) {
    return request<Routine>('/routines', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(routineId: string, input: UpdateRoutineInput) {
    return request<Routine>(`/routines/${routineId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  remove(routineId: string) {
    return request<void>(`/routines/${routineId}`, {
      method: 'DELETE',
    });
  },
};
