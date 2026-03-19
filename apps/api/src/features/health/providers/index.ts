import type { HealthProviderId } from '@workout/domain';

import { androidHealthConnectWorkoutSyncService } from './androidHealthConnectWorkoutSyncService.js';
import { appleHealthWorkoutSyncService } from './appleHealthWorkoutSyncService.js';

export const workoutSyncServices = [
  appleHealthWorkoutSyncService,
  androidHealthConnectWorkoutSyncService,
];

export function findWorkoutSyncService(providerId: HealthProviderId) {
  return workoutSyncServices.find((service) => service.providerId === providerId);
}

// TODO: Keep backend workout sync responsibilities isolated here as provider implementations are added.
