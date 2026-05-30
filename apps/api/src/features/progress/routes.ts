import type { FastifyInstance } from 'fastify';

import {
  getExerciseProgress,
  listExerciseProgress,
} from './repository.js';

export async function registerProgressRoutes(app: FastifyInstance) {
  app.get('/progress/exercises', async () => {
    return listExerciseProgress();
  });

  app.get<{ Params: { exerciseId: string } }>(
    '/progress/exercises/:exerciseId',
    async (request, reply) => {
      const progress = await getExerciseProgress(request.params.exerciseId);

      if (!progress) {
        return reply.code(404).send({
          message: 'Exercise progress not found',
        });
      }

      return progress;
    },
  );
}
