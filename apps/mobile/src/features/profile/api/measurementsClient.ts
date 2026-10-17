import type { BodyMeasurementEntry, BodyMeasurementInput } from '@workout/domain';

import { apiRequest } from '@/lib/http';

/** Body measurement entries; every value in canonical units (kg, cm, %). */
export const measurementsClient = {
  list() {
    return apiRequest<BodyMeasurementEntry[]>('/measurements');
  },
  create(input: BodyMeasurementInput) {
    return apiRequest<BodyMeasurementEntry>('/measurements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  update(entryId: string, input: BodyMeasurementInput) {
    return apiRequest<BodyMeasurementEntry>(`/measurements/${encodeURIComponent(entryId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  remove(entryId: string) {
    return apiRequest<void>(`/measurements/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
    });
  },
};
