/**
 * The latest active-energy reading of the workout in progress, so the app can
 * show the same kcal as the lock-screen status (spec 0017 amendment, spec
 * 0012). Fed by the refresher; keyed by the workout identity so a new workout
 * never shows the previous one's calories. `null` means unknown — no data or
 * no permission — and is never shown as 0.
 */
let reading: { clientId: string; kcal: number | null } | null = null;
const listeners = new Set<() => void>();

export function publishActiveEnergy(clientId: string | undefined, kcal: number | null) {
  const next = clientId ? { clientId, kcal } : null;
  if (next?.clientId === reading?.clientId && next?.kcal === reading?.kcal) {
    return;
  }
  reading = next;
  listeners.forEach((listener) => listener());
}

/** kcal for this workout, or `null` when unknown or read for another workout. */
export function getActiveEnergyKcal(clientId: string | undefined): number | null {
  return clientId && reading?.clientId === clientId ? reading.kcal : null;
}

export function subscribeActiveEnergy(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
