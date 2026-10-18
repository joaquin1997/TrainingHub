import { Platform } from 'react-native';

import { RestAlert } from '../../../../modules/rest-alert';

/** What the alert at the end of a rest says. */
export interface RestAlertContent {
  title: string;
  body: string;
}

/** Whether this device may alert outside the app (spec 0037 FR-8, FR-14). */
export type RestAlertPermission = 'notAsked' | 'denied' | 'granted' | 'unknown';

/**
 * The alert when a rest ends, delivered by the system so it also reaches a
 * person with the app in the background or the phone locked (spec 0018 FR-6).
 * There is only ever one: scheduling replaces the pending one.
 */
export interface RestAlerts {
  /** Asks to show alerts; the system asks the person only once. */
  requestPermission(): Promise<boolean>;
  /** Schedules the single rest alert at `at`, replacing any pending one. */
  schedule(at: Date, content: RestAlertContent): Promise<void>;
  /** Removes the pending (and an already delivered) rest alert. */
  cancel(): Promise<void>;
  /** Whether this device can alert outside the app at all (today iOS only). */
  readonly outsideApp: boolean;
  /** `unknown` when the build cannot tell (before spec 0037). */
  permissionStatus(): Promise<RestAlertPermission>;
  /** Opens the system settings where alerts are turned on. */
  openSystemSettings(): Promise<void>;
}

/** No alert outside the app; the rest still alerts inside it (EF-1). */
export const noopRestAlerts: RestAlerts = {
  requestPermission: async () => false,
  schedule: async () => {},
  cancel: async () => {},
  outsideApp: false,
  permissionStatus: async () => 'unknown',
  openSystemSettings: async () => {},
};

/** The iOS alert: a local notification from the `rest-alert` module. */
function iosRestAlerts(native: NonNullable<typeof RestAlert>): RestAlerts {
  return {
    requestPermission: () => native.requestPermission(),
    schedule: (at, content) => native.schedule(at.getTime(), content.title, content.body),
    cancel: () => native.cancel(),
    outsideApp: true,
    permissionStatus: async () => (native.permissionStatus ? native.permissionStatus() : 'unknown'),
    openSystemSettings: async () => {
      await native.openSettings?.();
    },
  };
}

/**
 * The rest alert for this device: iOS with the native module (after a device
 * rebuild), otherwise none — the rest then alerts only inside the app.
 *
 * TODO(sdd): rest alert outside the app on Android — noopRestAlerts there
 * (in-app vibration only); unblocked by adding expo-notifications for Android
 * or an Android branch in modules/rest-alert, when Android is tested.
 */
export function restAlertsForThisDevice(): RestAlerts {
  return Platform.OS === 'ios' && RestAlert ? iosRestAlerts(RestAlert) : noopRestAlerts;
}

