import type {
  ExerciseProgressDetail,
  ExerciseProgressSummary,
} from '@workout/domain';

import { API_BASE_URL } from '@/config/api';

type ErrorResponse = {
  message?: string;
};

async function request<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

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

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const progressClient = {
  list() {
    return request<ExerciseProgressSummary[]>('/progress/exercises');
  },
  getByExerciseId(exerciseId: string) {
    return request<ExerciseProgressDetail>(`/progress/exercises/${exerciseId}`);
  },
};
