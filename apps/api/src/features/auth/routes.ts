import type { FastifyInstance } from 'fastify';
import type { AuthSignInRequest } from '@workout/domain';

import { hashPassword, verifyPassword } from './password.js';
import { createEmailUser, findUserByEmail, mapUser } from './repository.js';
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
