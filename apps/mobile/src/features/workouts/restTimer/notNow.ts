import type { RestAlerts } from './restAlerts';

/**
 * The alerts the rest timer uses: as `alerts`, except that after "Not now" in
 * the first run the first rest never brings up the system prompt (spec 0037
 * FR-9); Settings is the way back.
 */
export function withNotNow(alerts: RestAlerts, saidNotNow: () => Promise<boolean>): RestAlerts {
  return {
    ...alerts,
    requestPermission: async () => ((await saidNotNow()) ? false : alerts.requestPermission()),
  };
}
