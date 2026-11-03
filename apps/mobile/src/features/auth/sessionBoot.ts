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
