import Fastify from 'fastify';

import { registerRoutes } from './routes/index.js';

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(registerRoutes);

  return app;
}
