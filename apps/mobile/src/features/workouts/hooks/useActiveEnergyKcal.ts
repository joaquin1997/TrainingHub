import { useSyncExternalStore } from 'react';

import {
  getActiveEnergyKcal,
  subscribeActiveEnergy,
} from '@/features/workouts/liveActivity/activeEnergyStore';

/** Latest kcal of this workout, or `null` while unknown (spec 0017 AC-13). */
export function useActiveEnergyKcal(clientId: string | undefined) {
  return useSyncExternalStore(subscribeActiveEnergy, () => getActiveEnergyKcal(clientId));
}
