import type {
  HealthIntegration,
  HealthWorkoutPayload,
  LiveWorkoutBridge,
} from '@workout/domain';

export const appleHealthIntegration: HealthIntegration = {
  providerId: 'apple-health',
  displayName: 'Apple Health',
  async isAvailable() {
    // TODO: Replace placeholder availability check with native Apple Health capability detection.
    return true;
  },
  async requestPermissions() {
    // TODO: Replace placeholder permission request with native Apple Health authorization flow.
    return false;
  },
};

export const appleHealthLiveWorkoutBridge: LiveWorkoutBridge = {
  providerId: 'apple-health',
  async startLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add native live workout bridging for Apple Health and Apple Watch when requested.
  },
  async updateLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add native live workout updates for Apple Health and Apple Watch when requested.
  },
  async finishLiveWorkout(_payload: HealthWorkoutPayload) {
    // TODO: Add native live workout completion for Apple Health and Apple Watch when requested.
  },
};

