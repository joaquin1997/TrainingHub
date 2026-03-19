import type { HealthProviderId } from '@workout/domain';

import {
  androidHealthConnectIntegration,
  androidHealthConnectLiveWorkoutBridge,
} from './androidHealthConnect';
import {
  appleHealthIntegration,
  appleHealthLiveWorkoutBridge,
} from './appleHealth';

export const healthIntegrations = [
  appleHealthIntegration,
  androidHealthConnectIntegration,
];

export const liveWorkoutBridges = [
  appleHealthLiveWorkoutBridge,
  androidHealthConnectLiveWorkoutBridge,
];

export function findHealthIntegration(providerId: HealthProviderId) {
  return healthIntegrations.find((integration) => integration.providerId === providerId);
}

export function findLiveWorkoutBridge(providerId: HealthProviderId) {
  return liveWorkoutBridges.find((bridge) => bridge.providerId === providerId);
}

// TODO: Keep mobile health provider access isolated here as native integrations are added.

