import { describe, expect, it } from 'vitest';

import { sessionBootDecision, tokenReadFailureAction } from './sessionBoot';

const token = `header.${btoa(JSON.stringify({ sub: 'ana' }))}.signature`;
const user = { id: 'ana', displayName: 'Ana', createdAt: '', updatedAt: '' };

describe('session startup (0001)', () => {
  it('opens with the identity validated by the server', () => {
    expect(sessionBootDecision(token, { kind: 'validated', user })).toEqual({
      status: 'signed-in', user, clearToken: false,
    });
  });

  it('discards rejected credentials without inventing an identity', () => {
    expect(sessionBootDecision(token, { kind: 'rejected' })).toEqual({
      status: 'signed-out', user: null, clearToken: true,
    });
  });

  it('preserves credentials and the workout owner when unreachable', () => {
    const result = sessionBootDecision(token, { kind: 'unreachable' });
    expect(result.status).toBe('offline');
    expect(result.clearToken).toBe(false);
    expect(result.user?.id).toBe('ana');
  });

  it('retries offline validation successfully or signs out on an actual rejection', () => {
    expect(sessionBootDecision(token, { kind: 'unreachable' }).status).toBe('offline');
    expect(sessionBootDecision(token, { kind: 'validated', user }).status).toBe('signed-in');
    expect(sessionBootDecision(token, { kind: 'rejected' }).clearToken).toBe(true);
  });

  it('never uses a guessed owner for an unreadable token', () => {
    expect(sessionBootDecision('unreadable', { kind: 'unreachable' })).toEqual({
      status: 'signed-out', user: null, clearToken: true,
    });
  });

  it('opens signed out when no credentials are stored', () => {
    expect(sessionBootDecision(null, { kind: 'unreachable' })).toEqual({
      status: 'signed-out', user: null, clearToken: false,
    });
  });
});

describe('token read failure (0045 EF-2)', () => {
  it('waits for the front to read again when launched in the background', () => {
    expect(tokenReadFailureAction('background')).toBe('retry-when-active');
    expect(tokenReadFailureAction('inactive')).toBe('retry-when-active');
    expect(tokenReadFailureAction(null)).toBe('retry-when-active');
  });

  it('opens signed out when the read fails in the front', () => {
    expect(tokenReadFailureAction('active')).toBe('start-signed-out');
  });
});
