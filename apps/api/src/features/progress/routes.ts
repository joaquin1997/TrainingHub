import type { FastifyInstance } from 'fastify';

import { findMockExerciseProgress } from './mock-progress.js';

export async function registerProgressRoutes(app: FastifyInstance) {
  app.get<{ Params: { exerciseId: string } }>(
    '/progress/exercises/:exerciseId',
    async (request, reply) => {
      const progress = findMockExerciseProgress(request.params.exerciseId);

      if (!progress) {
        return reply.code(404).send({
          message: 'Exercise progress not found',
        });
      }

      return progress;
    },
  );
}

