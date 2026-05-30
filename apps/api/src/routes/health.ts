import type { FastifyInstance } from 'fastify';

import { prisma } from '../infrastructure/prisma.js';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return { status: 'ok', db: 'up' };
    } catch {
      return reply.code(503).send({ status: 'error', db: 'down' });
    }
  });
}
