import type { StartingRecords } from '@workout/domain';

import { apiRequest } from '@/lib/http';

export const startingRecordsClient = {
  /** One entry per exercise asked; an older server answers 404 (spec 0032 EF-3). */
  list(exerciseIds: string[]) {
    const query = exerciseIds.map(encodeURIComponent).join(',');
    return apiRequest<StartingRecords[]>(`/progress/starting-records?exerciseIds=${query}`);
  },
};
