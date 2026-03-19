import type { FastifyInstance } from 'fastify';

import { registerHealthRoutes } from './health.js';

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);

  // TODO: Register future feature modules from src/features/* here.
}

