import type { User } from '@workout/domain';

import { tokenSubject } from './tokenSubject';

export type SessionBootOutcome =
  | { kind: 'validated'; user: User }
  | { kind: 'rejected' }
  | { kind: 'unreachable' };

export type SessionBootDecision =
  | { status: 'signed-out'; user: null; clearToken: boolean }
  | { status: 'signed-in' | 'offline'; user: User; clearToken: false };

/** Network/server failures preserve the stored identity; only a rejection clears it. */
export function sessionBootDecision(token: string | null, outcome: SessionBootOutcome): SessionBootDecision {
  if (!token || outcome.kind === 'rejected') {
    return { status: 'signed-out', user: null, clearToken: token !== null };
  }
  if (outcome.kind === 'validated') {
    return { status: 'signed-in', user: outcome.user, clearToken: false };
  }
  const id = tokenSubject(token);
  if (!id) return { status: 'signed-out', user: null, clearToken: true };
  return {
    status: 'offline',
    user: { id, displayName: '', createdAt: '', updatedAt: '' },
    clearToken: false,
  };
}

/**
 * What to do when the stored token could not be read (spec 0045 EF-2). The
 * token store is locked until the phone is unlocked, so a launch in the
 * background with the phone locked fails to read it: keep the start-up screen
 * and read again when the app comes to the front, instead of opening signed
 * out. A failure in the front is a real one and opens signed out, as before.
 */
export function tokenReadFailureAction(appState: string | null | undefined): 'retry-when-active' | 'start-signed-out' {
  return appState === 'active' ? 'start-signed-out' : 'retry-when-active';
}
