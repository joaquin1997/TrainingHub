import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';

/** What the API keeps from a verified Google ID token (spec 0039). */
export interface GoogleIdentity {
  subject: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

export type GoogleKeyFetcher = () => Promise<Array<JsonWebKey & { kid?: string }>>;

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
/** Tolerated clock difference with Google, in seconds. */
const CLOCK_SKEW_SECONDS = 60;

export const fetchGoogleKeys: GoogleKeyFetcher = async () => {
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Google keys: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  return body.keys ?? [];
};

/** The client ids Google tokens must be issued for (`GOOGLE_CLIENT_IDS`, comma list). */
export function configuredGoogleClientIds(value = process.env.GOOGLE_CLIENT_IDS): string[] {
  return (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Verifies a Google ID token (spec 0039 FR-3, AC-7): RS256 signature with
 * Google's published keys (cached by key id, refetched for an unknown one),
 * issuer, audience among `clientIds`, not expired. Null when anything fails.
 */
export function createGoogleIdTokenVerifier({
  clientIds,
  fetchKeys = fetchGoogleKeys,
  now = () => Date.now(),
}: {
  clientIds: string[];
  fetchKeys?: GoogleKeyFetcher;
  now?: () => number;
}) {
  let keys = new Map<string, JsonWebKey>();

  const keyFor = async (kid: string) => {
    if (!keys.has(kid)) {
      keys = new Map((await fetchKeys()).filter((key) => key.kid).map((key) => [key.kid!, key]));
    }
    return keys.get(kid) ?? null;
  };

  return async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
    const header = decodeSegment(headerPart);
    const payload = decodeSegment(payloadPart);
    if (!header || !payload || header.alg !== 'RS256' || typeof header.kid !== 'string') {
      return null;
    }

    const jwk = await keyFor(header.kid).catch(() => null);
    if (!jwk) {
      return null;
    }
    const signed = verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(signaturePart, 'base64url'),
    );
    if (!signed) {
      return null;
    }

    const nowSeconds = now() / 1000;
    const audience = payload.aud;
    if (
      typeof payload.iss !== 'string' ||
      !ISSUERS.has(payload.iss) ||
      typeof audience !== 'string' ||
      !clientIds.includes(audience) ||
      typeof payload.exp !== 'number' ||
      payload.exp + CLOCK_SKEW_SECONDS < nowSeconds ||
      typeof payload.sub !== 'string' ||
      !payload.sub
    ) {
      return null;
    }

    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : undefined,
    };
  };
}
