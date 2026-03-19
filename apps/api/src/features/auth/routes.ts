import type { FastifyInstance } from 'fastify';
import type { AuthSignInRequest } from '@workout/domain';

import { findAuthProvider } from './providers/index.js';

type AppleLoginBody = AuthSignInRequest;

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: AppleLoginBody }>('/auth/apple/login', async (request, reply) => {
    const provider = findAuthProvider('apple');

    if (!provider) {
      return reply.code(500).send({
        message: 'Apple auth provider is not configured',
      });
    }

    const session = await provider.authenticate(request.body.credential);

    if (!session) {
      return reply.code(401).send({
        message: 'Apple login failed',
      });
    }

    // TODO: Replace placeholder auth route behavior with real session persistence and HTTP-only cookie/token delivery.
    return reply.code(200).send({
      providerId: provider.id,
      session,
    });
  });
}
