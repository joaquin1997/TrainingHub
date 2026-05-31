import type { FastifyInstance } from 'fastify';

import {
  getExerciseProgress,
  listExerciseProgress,
  listMuscleGroupVolume,
  listWeeklyVolume,
} from './repository.js';

export async function registerProgressRoutes(app: FastifyInstance) {
  app.get('/progress/exercises', async () => {
    return listExerciseProgress();
  });

  app.get('/progress/weekly-volume', async () => {
    return listWeeklyVolume();
  });

  app.get('/progress/muscle-distribution', async () => {
    return listMuscleGroupVolume();
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
