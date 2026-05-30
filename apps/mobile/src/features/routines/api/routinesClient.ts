import type {
  CreateRoutineInput,
  Routine,
  UpdateRoutineInput,
} from '@workout/domain';

import { apiRequest } from '@/lib/http';

// TODO: Add auth headers here once the mobile app exchanges provider credentials for app sessions.
export const routinesClient = {
  list() {
    return apiRequest<Routine[]>('/routines');
  },
  getById(routineId: string) {
    return apiRequest<Routine>(`/routines/${routineId}`);
  },
  create(input: CreateRoutineInput) {
    return apiRequest<Routine>('/routines', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(routineId: string, input: UpdateRoutineInput) {
    return apiRequest<Routine>(`/routines/${routineId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  remove(routineId: string) {
    return apiRequest<void>(`/routines/${routineId}`, {
      method: 'DELETE',
    });
  },
};
