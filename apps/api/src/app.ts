import fastifyJwt from '@fastify/jwt';
import Fastify, {
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

import { findSessionUser } from './infrastructure/sessionUser.js';
import { parseCatalogLanguage, runWithCatalogLanguage } from './infrastructure/requestLanguage.js';
import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Rejects requests without an expiring token for an existing account. */
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export function createApp(
  options: { logger?: FastifyServerOptions['logger'] } = {},
) {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim() && !['development', 'test'].includes(process.env.NODE_ENV ?? '')) {
    throw new Error('JWT_SECRET is required outside development and test');
  }

  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.register(fastifyJwt, {
    secret: secret?.trim() ? secret : 'dev-insecure-secret-change-me',
    sign: { expiresIn: '90d' },
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        const claims = request.user as { sub?: unknown; exp?: unknown };
        if (
          typeof claims.sub !== 'string' || !claims.sub ||
          typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)
        ) {
          await reply.code(401).send({ message: 'Unauthorized' });
          return;
        }
      } catch {
        await reply.code(401).send({ message: 'Unauthorized' });
      }
      if (reply.sent) return;
      if (!await findSessionUser(request.user.sub)) {
        await reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  );

  // Public credential acquisition only; every future route is protected by default.
  const publicRoutes = new Set([
    'GET /health',
    'POST /auth/login',
    'POST /auth/register',
    'POST /auth/google',
  ]);
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (!publicRoutes.has(`${request.method} ${path}`)) {
      await app.authenticate(request, reply);
    }
  });

  // Catalog names in the app's language for the rest of the request (spec 0044).
  app.addHook('onRequest', (request, _reply, done) => {
    runWithCatalogLanguage(parseCatalogLanguage(request.headers['accept-language']), done);
  });

  app.register(registerRoutes);

  return app;
}
