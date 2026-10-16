import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import {
  getExerciseProgress,
  listExerciseProgress,
  listMuscleGroupVolume,
  listSessionRecords,
  listWeeklyVolume,
} from './repository.js';

export async function registerProgressRoutes(app: FastifyInstance) {
  app.get('/progress/exercises', async (request) => {
    return listExerciseProgress(await resolveUserPublicId(request));
  });

  app.get('/progress/weekly-volume', async (request) => {
    return listWeeklyVolume(await resolveUserPublicId(request));
  });

  app.get('/progress/muscle-distribution', async (request) => {
    return listMuscleGroupVolume(await resolveUserPublicId(request));
  });

  // The records each workout beat (spec 0023), newest first.
  app.get('/progress/session-records', async (request) => {
    return listSessionRecords(await resolveUserPublicId(request));
  });

  app.get<{ Params: { exerciseId: string } }>(
    '/progress/exercises/:exerciseId',
    async (request, reply) => {
      const progress = await getExerciseProgress(
        await resolveUserPublicId(request),
        request.params.exerciseId,
      );

      if (!progress) {
        return reply.code(404).send({
          message: 'Exercise progress not found',
        });
      }

      return progress;
    },
  );
}
