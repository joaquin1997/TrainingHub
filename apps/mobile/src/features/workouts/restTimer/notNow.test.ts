import { describe, expect, it, vi } from 'vitest';

import { withNotNow } from './notNow';
import type { RestAlerts } from './restAlerts';

const noopRestAlerts: RestAlerts = {
  requestPermission: async () => false,
  schedule: async () => {},
  cancel: async () => {},
  outsideApp: false,
  permissionStatus: async () => 'unknown',
  openSystemSettings: async () => {},
};

describe('withNotNow (spec 0037 FR-9)', () => {
  it('never brings up the system prompt after "Not now"', async () => {
    const requestPermission = vi.fn(async () => true);
    const alerts = withNotNow({ ...noopRestAlerts, requestPermission }, async () => true);

    expect(await alerts.requestPermission()).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('asks as before for people who never saw the question (AC-16)', async () => {
    const requestPermission = vi.fn(async () => true);
    const alerts = withNotNow({ ...noopRestAlerts, requestPermission }, async () => false);

    expect(await alerts.requestPermission()).toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});
