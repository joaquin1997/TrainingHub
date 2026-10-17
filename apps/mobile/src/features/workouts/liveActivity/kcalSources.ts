/**
 * Chooses which calorie reading is shown (spec 0025 FR-3): the phone's own
 * Health reading (spec 0012) until the watch has measured the workout; from
 * then on only the watch's, so the app shows the watch's figure.
 */
export function createKcalSources(
  show: (clientId: string | undefined, kcal: number | null) => void,
) {
  let watchMeasured: string | null = null;

  return {
    fromPhone(clientId: string | undefined, kcal: number | null) {
      if (!clientId || clientId !== watchMeasured) {
        show(clientId, kcal);
      }
    },
    fromWatch(clientId: string, kcal: number) {
      watchMeasured = clientId;
      show(clientId, kcal);
    },
  };
}
