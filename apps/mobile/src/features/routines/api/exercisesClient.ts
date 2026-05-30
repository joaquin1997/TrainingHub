import type { Exercise, MuscleGroup } from '@workout/domain';

import { API_BASE_URL } from '@/config/api';

type CreateExerciseInput = {
  name: string;
  primaryMuscleGroupIds: string[];
  secondaryMuscleGroupIds: string[];
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

export const exercisesClient = {
  list() {
    return request<Exercise[]>('/exercises');
  },
  listMuscleGroups() {
    return request<MuscleGroup[]>('/muscle-groups');
  },
  create(input: CreateExerciseInput) {
    return request<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
