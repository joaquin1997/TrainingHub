import Fastify, { type FastifyServerOptions } from 'fastify';

import { registerRoutes } from './routes/index.js';

export function createApp(
  options: { logger?: FastifyServerOptions['logger'] } = {},
) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.register(registerRoutes);

  return app;
}
