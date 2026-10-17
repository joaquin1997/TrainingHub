/**
 * The haptic language (spec 0034 FR-4, FR-5): exactly four events, each with
 * its own pattern, the same wherever it happens. Nothing else in the app
 * produces haptics. Pure, so the mapping is tested without a device; the app
 * binds it to the platform in `haptics.ts`.
 */
export interface HapticDriver {
  impact(style: 'light' | 'heavy'): Promise<void>;
  notification(type: 'success' | 'warning'): Promise<void>;
}

export interface HapticLanguage {
  /** A set ticked done (not unticked): a light, crisp tap. */
  setDone(): void;
  /** A ticked set earned a record badge — instead of the set-done tap. */
  record(): void;
  /** The rest ended with the app in front: a double knock. */
  restOver(): void;
  /** A destructive action was confirmed. */
  destructiveConfirm(): void;
}

/** Gap between the two knocks of "rest over". */
export const REST_OVER_GAP_MS = 150;

/**
 * Builds the language over a driver. With no driver (web, EF-1) every event
 * does nothing; a driver that fails (no hardware, a binary without the
 * module, haptics off) fails silently — feedback never shows an error.
 */
export function createHapticLanguage(
  driver: HapticDriver | null,
  schedule: (run: () => void, ms: number) => void = setTimeout,
): HapticLanguage {
  const fire = (play: (d: HapticDriver) => Promise<void>) => {
    if (!driver) {
      return;
    }
    try {
      void play(driver).catch(() => undefined);
    } catch {
      // A missing native module may throw synchronously too.
    }
  };

  return {
    setDone: () => fire((d) => d.impact('light')),
    record: () => fire((d) => d.notification('success')),
    restOver: () => {
      fire((d) => d.impact('heavy'));
      schedule(() => fire((d) => d.impact('heavy')), REST_OVER_GAP_MS);
    },
    destructiveConfirm: () => fire((d) => d.notification('warning')),
  };
}
