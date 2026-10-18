import type { FastifyInstance } from 'fastify';
import type { AuthSignInRequest } from '@workout/domain';

import { configuredGoogleClientIds, createGoogleIdTokenVerifier } from './googleIdToken.js';
import { googleDisplayName, resolveGoogleSignIn } from './googleSignIn.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  createEmailUser,
  createUserWithIdentity,
  findUserByEmail,
  findUserById,
  findUserByIdentity,
  linkIdentity,
  mapUser,
} from './repository.js';
import { findAuthProvider } from './providers/index.js';

type AppleLoginBody = AuthSignInRequest;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCredentials(body: unknown) {
  if (
    !isRecord(body) ||
    typeof body.email !== 'string' ||
    typeof body.password !== 'string'
  ) {
    return null;
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (!email || password.length < 6) {
    return null;
  }

  const displayName =
    typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim()
      : email.split('@')[0]!;

  return { email, password, displayName };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: unknown }>('/auth/register', async (request, reply) => {
    const input = parseCredentials(request.body);

    if (!input) {
      return reply.code(400).send({
        message: 'Email and a password of at least 6 characters are required',
      });
    }

    const existing = await findUserByEmail(input.email);
    if (existing) {
      return reply.code(409).send({ message: 'Email already registered' });
    }

    const user = await createEmailUser({
      email: input.email,
      passwordHash: hashPassword(input.password),
      displayName: input.displayName,
    });

    const token = app.jwt.sign({ sub: user.publicId });
    return reply.code(201).send({ token, user: mapUser(user) });
  });

  app.post<{ Body: unknown }>('/auth/login', async (request, reply) => {
    const input = parseCredentials(request.body);

    if (!input) {
      return reply.code(400).send({ message: 'Invalid credentials' });
    }

    const user = await findUserByEmail(input.email);

    if (
      !user?.passwordHash ||
      !verifyPassword(input.password, user.passwordHash)
    ) {
      return reply.code(401).send({ message: 'Invalid email or password' });
    }

    const token = app.jwt.sign({ sub: user.publicId });
    return reply.code(200).send({ token, user: mapUser(user) });
  });

  // Sign in with Google (spec 0039). The client ids come from
  // GOOGLE_CLIENT_IDS; without them the server says it is not available (EF-5).
  const googleClientIds = configuredGoogleClientIds();
  const verifyGoogleIdToken = createGoogleIdTokenVerifier({ clientIds: googleClientIds });

  app.post<{ Body: unknown }>('/auth/google', async (request, reply) => {
    if (googleClientIds.length === 0) {
      return reply.code(503).send({ message: 'Google sign-in is not available' });
    }
    const body = request.body;
    if (!isRecord(body) || typeof body.idToken !== 'string' || !body.idToken) {
      return reply.code(400).send({ message: 'Missing Google ID token' });
    }

    const identity = await verifyGoogleIdToken(body.idToken);
    if (!identity) {
      return reply.code(401).send({ message: 'Google sign-in failed' });
    }

    const identityOwner = await findUserByIdentity('google', identity.subject);
    const emailOwner = identity.email ? await findUserByEmail(identity.email) : null;
    const outcome = resolveGoogleSignIn({
      identity,
      identityOwnerId: identityOwner?.id ?? null,
      emailOwnerId: emailOwner?.id ?? null,
    });

    let user;
    switch (outcome.kind) {
      case 'existing':
        user = identityOwner;
        break;
      case 'link':
        await linkIdentity({
          userId: outcome.userId,
          provider: 'google',
          subject: identity.subject,
          email: identity.email,
        });
        user = await findUserById(outcome.userId);
        break;
      case 'conflict':
        return reply.code(409).send({
          message: 'This email already has an account — sign in with its password',
        });
      case 'create':
        user = await createUserWithIdentity({
          email: identity.email,
          displayName: googleDisplayName(identity),
          provider: 'google',
          subject: identity.subject,
        });
        break;
    }

    if (!user) {
      return reply.code(401).send({ message: 'Google sign-in failed' });
    }
    const token = app.jwt.sign({ sub: user.publicId });
    return reply.code(200).send({ token, user: mapUser(user) });
  });

  app.post<{ Body: AppleLoginBody }>('/auth/apple/login', async (request, reply) => {
    const provider = findAuthProvider('apple');

    if (!provider) {
      return reply.code(500).send({
        message: 'Apple auth provider is not configured',
      });
    }

    const session = await provider.authenticate(request.body.credential);

    if (!session) {
      return reply.code(401).send({ message: 'Apple login failed' });
    }

    // TODO: issue a real app JWT here once Apple token validation is wired.
    return reply.code(200).send({ providerId: provider.id, session });
  });
}
