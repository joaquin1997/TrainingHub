import type { HealthProviderId } from '@workout/domain';

import {
  androidHealthConnectIntegration,
  androidHealthConnectLiveWorkoutBridge,
} from './androidHealthConnect';
import {
  appleHealthIntegration,
  appleHealthLiveWorkoutBridge,
} from './appleHealth';
import { appleWatchWorkoutBridge } from './appleWatch';

export const healthIntegrations = [
  appleHealthIntegration,
  androidHealthConnectIntegration,
];

export const liveWorkoutBridges = [
  appleHealthLiveWorkoutBridge,
  androidHealthConnectLiveWorkoutBridge,
];

/** Watches that can run the active workout (spec 0025); Android has none yet. */
export const watchWorkoutBridges = [appleWatchWorkoutBridge];

export function findHealthIntegration(providerId: HealthProviderId) {
  return healthIntegrations.find((integration) => integration.providerId === providerId);
}

export function findLiveWorkoutBridge(providerId: HealthProviderId) {
  return liveWorkoutBridges.find((bridge) => bridge.providerId === providerId);
}

export function findWatchWorkoutBridge(providerId: HealthProviderId) {
  return watchWorkoutBridges.find((bridge) => bridge.providerId === providerId);
}

// TODO: Keep mobile health provider access isolated here as native integrations are added.

