import fastifyJwt from '@fastify/jwt';
import Fastify, {
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler that 401s unless the request carries a valid bearer token. */
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
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        await reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  );

  // Optional auth: populate request.user when a valid bearer token is present,
  // otherwise stay anonymous (repos fall back to the dev user during the
  // multi-user transition). Flip to a strict `authenticate` preHandler later.
  app.addHook('onRequest', async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      // anonymous request
    }
  });

  app.register(registerRoutes);

  return app;
}
