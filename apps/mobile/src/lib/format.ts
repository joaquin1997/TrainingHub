/**
 * Shared date formatting for screens that render ISO timestamps.
 */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

/**
 * Compact day/month label for dense axes (e.g. chart ticks).
 */
export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
  });
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

/**
 * Formats a duration in seconds as `m:ss` (or `h:mm:ss` past an hour). Negative
 * values are clamped to zero.
 */
export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}

/**
 * Elapsed seconds between two ISO timestamps (0 if either is missing/invalid).
 */
export function durationSecondsBetween(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) {
    return 0;
  }

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 1000));
}

/**
 * Active duration: elapsed time minus paused time, never negative (spec 0011).
 * With no paused time it equals `durationSecondsBetween`, so workouts saved
 * before pause existed read as before.
 */
export function activeDurationSeconds(
  startIso?: string,
  endIso?: string,
  pausedSeconds = 0,
) {
  return Math.max(0, durationSecondsBetween(startIso, endIso) - pausedSeconds);
}
