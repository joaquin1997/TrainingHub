/** What the alert at the end of a rest says. */
export interface RestAlertContent {
  title: string;
  body: string;
}

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
}

/** No alert outside the app; the rest still alerts inside it (EF-1). */
export const noopRestAlerts: RestAlerts = {
  requestPermission: async () => false,
  schedule: async () => {},
  cancel: async () => {},
};
