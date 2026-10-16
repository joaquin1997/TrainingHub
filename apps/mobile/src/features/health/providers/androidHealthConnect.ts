import type {
  HealthIntegration,
  HealthWorkoutPayload,
  LiveWorkoutBridge,
} from '@workout/domain';

export const androidHealthConnectIntegration: HealthIntegration = {
  providerId: 'android-health-connect',
  displayName: 'Android Health Connect',
  async isAvailable() {
    // TODO: Replace placeholder availability check with Health Connect capability detection.
    return true;
  },
  async requestPermissions() {
    // TODO: Replace placeholder permission request with Health Connect authorization flow.
    return false;
  },
  async readActiveEnergyKcal() {
    // Unknown, never 0 (spec 0012 EF-2). TODO: read Health Connect when an
    // Android live status is specified.
    return null;
  },
};

export const androidHealthConnectLiveWorkoutBridge: LiveWorkoutBridge = {
  providerId: 'android-health-connect',
  async startLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add Android live workout bridge only when Health Connect live sync is requested.
  },
  async updateLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add Android live workout updates only when Health Connect live sync is requested.
  },
  async finishLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add Android live workout completion only when Health Connect live sync is requested.
  },
};

