import type { GoogleIdentity } from './googleIdToken.js';

/**
 * Which account a verified Google identity signs in to (spec 0039 FR-4 –
 * FR-6, EF-4):
 * - `existing`: the identity was seen before;
 * - `link`: new identity, verified email equal to an account's email;
 * - `create`: new identity and no account uses its email;
 * - `conflict`: new identity whose unverified email belongs to an account —
 *   never a way into someone else's account.
 */
export function resolveGoogleSignIn({
  identity,
  identityOwnerId,
  emailOwnerId,
}: {
  identity: GoogleIdentity;
  /** The account the identity already belongs to, if any. */
  identityOwnerId: bigint | null;
  /** The account using the identity's email, if any. */
  emailOwnerId: bigint | null;
}):
  | { kind: 'existing'; userId: bigint }
  | { kind: 'link'; userId: bigint }
  | { kind: 'create' }
  | { kind: 'conflict' } {
  if (identityOwnerId !== null) {
    return { kind: 'existing', userId: identityOwnerId };
  }
  if (emailOwnerId !== null) {
    return identity.emailVerified ? { kind: 'link', userId: emailOwnerId } : { kind: 'conflict' };
  }
  return { kind: 'create' };
}

/** Display name for a new account: Google's name, else the email's local part. */
export function googleDisplayName(identity: GoogleIdentity): string {
  return identity.name ?? identity.email?.split('@')[0] ?? 'TrainingHub';
}
