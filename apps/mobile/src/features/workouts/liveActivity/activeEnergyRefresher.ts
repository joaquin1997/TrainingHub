import type { HealthIntegration } from '@workout/domain';

import type { ActiveWorkoutStore } from './liveWorkoutController';

/** How often calories refresh while the app is in the foreground (spec 0012). */
export const ACTIVE_ENERGY_REFRESH_MS = 60_000;

/**
 * Keeps the live status's calories current (spec 0012 FR-2, EF-2, EF-5):
 * - asks for Health permission once, when the first workout starts;
 * - reads at workout start, when the app becomes active, and every minute in
 *   the foreground unless paused (JS timers do not run in the background, so a
 *   locked phone shows the last value);
 * - `null` (no data, no permission) is shown as unknown; a failed read keeps
 *   the last value.
 * Calories cover start → now, paused stretches included (spec assumption).
 */
export function startActiveEnergyRefresher({
  health,
  store,
  onKcal,
  intervalMs = ACTIVE_ENERGY_REFRESH_MS,
}: {
  health: Pick<HealthIntegration, 'requestPermissions' | 'readActiveEnergyKcal'>;
  store: Pick<ActiveWorkoutStore, 'get' | 'subscribe'>;
  onKcal: (kcal: number | null) => void;
  intervalMs?: number;
}) {
  let permissionAsked = false;
  let currentId: string | null = null;
  let foreground = true;
  let timer: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    const draft = store.get();
    if (!draft) {
      return;
    }

    try {
      const kcal = await health.readActiveEnergyKcal(draft.startedAt);
      // Ignore a reading that arrives after the workout changed.
      if (store.get()?.clientId === draft.clientId) {
        onKcal(kcal);
      }
    } catch {
      // EF-5: Health unreadable right now (e.g. phone locked); keep the last value.
    }
  };

  const updateTimer = () => {
    const draft = store.get();
    const shouldTick = foreground && draft !== null && !draft.pausedAt;
    if (shouldTick && !timer) {
      timer = setInterval(() => void refresh(), intervalMs);
    } else if (!shouldTick && timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const onWorkoutChange = () => {
    const draft = store.get();
    const startedNew = draft !== null && draft.clientId !== currentId;
    currentId = draft?.clientId ?? null;
    updateTimer();

    if (!startedNew) {
      return;
    }

    void (async () => {
      if (!permissionAsked) {
        permissionAsked = true;
        await health.requestPermissions().catch(() => false);
      }
      await refresh();
    })();
  };

  const unsubscribe = store.subscribe(onWorkoutChange);
  onWorkoutChange();

  return {
    setForeground(isForeground: boolean) {
      foreground = isForeground;
      updateTimer();
      if (isForeground) {
        void refresh();
      }
    },
    /** Reads now (tests, or an explicit refresh). */
    refresh,
    stop() {
      unsubscribe();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
