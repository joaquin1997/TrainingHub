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
