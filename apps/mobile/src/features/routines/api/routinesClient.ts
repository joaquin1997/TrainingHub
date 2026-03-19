import type { Routine } from '@workout/domain';

import { API_BASE_URL } from '@/config/api';

export type RoutineExerciseWriteInput = {
  exerciseName: string;
  orderIndex: number;
  sets: Array<{
    setNumber: number;
    minReps?: number;
    maxReps?: number;
    targetWeight?: number;
  }>;
};

type RoutineWriteInput = {
  name: string;
  description?: string;
  exercises: RoutineExerciseWriteInput[];
};

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

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const routinesClient = {
  list() {
    return request<Routine[]>('/routines');
  },
  getById(routineId: string) {
    return request<Routine>(`/routines/${routineId}`);
  },
  create(input: RoutineWriteInput) {
    return request<Routine>('/routines', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(routineId: string, input: RoutineWriteInput) {
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
