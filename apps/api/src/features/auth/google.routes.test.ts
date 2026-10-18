import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const verifier = vi.hoisted(() => vi.fn());
const clientIds = vi.hoisted(() => ({ value: ['ios-client'] as string[] }));

vi.mock('./googleIdToken.js', () => ({
  configuredGoogleClientIds: () => clientIds.value,
  createGoogleIdTokenVerifier: () => verifier,
}));
vi.mock('./repository.js', () => ({
  mapUser: (user: { publicId: string; displayName: string }) => ({
    id: user.publicId,
    displayName: user.displayName,
    createdAt: '',
    updatedAt: '',
  }),
  findUserByEmail: vi.fn(),
  findUserByIdentity: vi.fn(),
  findUserById: vi.fn(),
  linkIdentity: vi.fn(),
  createUserWithIdentity: vi.fn(),
  createEmailUser: vi.fn(),
}));

import { createApp } from '../../app.js';
import {
  createUserWithIdentity,
  findUserByEmail,
  findUserById,
  findUserByIdentity,
  linkIdentity,
} from './repository.js';

const app = createApp({ logger: false });

const ana = { id: 9n, publicId: 'ana', displayName: 'Ana', passwordHash: 'x' };
const google = { subject: 'g-1', email: 'ana@gmail.com', emailVerified: true, name: 'Ana G' };

const signIn = () =>
  app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 'token' } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findUserByIdentity).mockResolvedValue(null);
  vi.mocked(findUserByEmail).mockResolvedValue(null);
});

afterAll(async () => {
  await app.close();
});

describe('POST /auth/google (spec 0039)', () => {
  it('refuses an identity Google did not issue for this app (EF-3)', async () => {
    verifier.mockResolvedValue(null);
    const response = await signIn();
    expect(response.statusCode).toBe(401);
  });

  it('creates an account for a new person (FR-6, AC-2)', async () => {
    verifier.mockResolvedValue(google);
    vi.mocked(createUserWithIdentity).mockResolvedValue({ ...ana, publicId: 'new', displayName: 'Ana G' } as never);
    const response = await signIn();
    expect(response.statusCode).toBe(200);
    expect(createUserWithIdentity).toHaveBeenCalledWith({
      email: 'ana@gmail.com',
      displayName: 'Ana G',
      provider: 'google',
      subject: 'g-1',
    });
    expect(response.json().token).toEqual(expect.any(String));
  });

  it('links a verified email to the existing account (FR-5, AC-3)', async () => {
    verifier.mockResolvedValue(google);
    vi.mocked(findUserByEmail).mockResolvedValue(ana as never);
    vi.mocked(findUserById).mockResolvedValue(ana as never);
    const response = await signIn();
    expect(response.statusCode).toBe(200);
    expect(linkIdentity).toHaveBeenCalledWith({
      userId: 9n,
      provider: 'google',
      subject: 'g-1',
      email: 'ana@gmail.com',
    });
    expect(response.json().user.id).toBe('ana');
  });

  it('refuses an unverified email that belongs to an account (EF-4)', async () => {
    verifier.mockResolvedValue({ ...google, emailVerified: false });
    vi.mocked(findUserByEmail).mockResolvedValue(ana as never);
    const response = await signIn();
    expect(response.statusCode).toBe(409);
    expect(linkIdentity).not.toHaveBeenCalled();
  });

  it('signs in to the account the identity already belongs to (FR-4)', async () => {
    verifier.mockResolvedValue(google);
    vi.mocked(findUserByIdentity).mockResolvedValue(ana as never);
    const response = await signIn();
    expect(response.json().user.id).toBe('ana');
    expect(createUserWithIdentity).not.toHaveBeenCalled();
  });
});

describe('email login of a Google-only account (FR-7, AC-4)', () => {
  it('fails as for a wrong password', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({ ...ana, passwordHash: null } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ana@gmail.com', password: 'whatever' },
    });
    expect(response.statusCode).toBe(401);
  });
});
