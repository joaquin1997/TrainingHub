/**
 * The subject (`sub`, the user's public id) of a JWT, read without verifying
 * it — the server verifies on every request. Used to know who is signed in
 * during offline startup when the server cannot validate it. Returns null for
 * anything that is not a readable token.
 */
export function tokenSubject(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims: unknown = JSON.parse(atob(padded));
    const sub =
      typeof claims === 'object' && claims !== null
        ? (claims as { sub?: unknown }).sub
        : undefined;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
}
