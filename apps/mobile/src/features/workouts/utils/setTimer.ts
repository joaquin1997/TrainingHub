/**
 * The timer inside a timed set (spec 0021 FR-4). With a time to aim for it
 * counts down from it; without one it counts up. Times are whole seconds.
 */
export type RunningSetTimer = {
  /** Epoch ms when it started. */
  startedAt: number;
  /** Countdown length; absent for a stopwatch. */
  targetSeconds?: number;
};

const elapsedSeconds = (timer: RunningSetTimer, now: number) =>
  Math.max(0, Math.floor((now - timer.startedAt) / 1000));

/** What the set shows while the timer runs: time left, or time so far. */
export function setTimerDisplaySeconds(timer: RunningSetTimer, now: number) {
  const elapsed = elapsedSeconds(timer, now);
  return timer.targetSeconds !== undefined
    ? Math.max(0, timer.targetSeconds - elapsed)
    : elapsed;
}

/** A countdown that has reached zero. A stopwatch never finishes on its own. */
export function isSetTimerFinished(timer: RunningSetTimer, now: number) {
  return (
    timer.targetSeconds !== undefined && elapsedSeconds(timer, now) >= timer.targetSeconds
  );
}

/** The time the set gets when the timer stops: what was done, at most the target. */
export function setTimerFillSeconds(timer: RunningSetTimer, now: number) {
  const elapsed = elapsedSeconds(timer, now);
  return timer.targetSeconds !== undefined ? Math.min(elapsed, timer.targetSeconds) : elapsed;
}
