import { parseComparisonBefore } from './comparisonReferences.js';
import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import {
  getExerciseProgress,
  listComparisonReferences,
  listExerciseProgress,
  listMuscleGroupVolume,
  listSessionRecords,
  listStartingRecords,
  listWeeklyVolume,
} from './repository.js';
import { parseExerciseIds } from './startingRecords.js';

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

  // Bests to judge live record badges against (spec 0032), one per id asked.
  app.get<{ Querystring: { exerciseIds?: string } }>(
    '/progress/starting-records',
    async (request, reply) => {
      const exerciseIds = parseExerciseIds(request.query.exerciseIds);
      if (!exerciseIds) {
        return reply.code(400).send({ message: 'Invalid exerciseIds' });
      }

      return listStartingRecords(await resolveUserPublicId(request), exerciseIds);
    },
  );

  app.get<{ Querystring: { exerciseIds?: string; before?: string } }>(
    '/progress/comparison-references', async (request, reply) => {
      const ids = parseExerciseIds(request.query.exerciseIds);
      const before = parseComparisonBefore(request.query.before);
      if (!ids || !before) {
        return reply.code(400).send({ message: 'Invalid exerciseIds or before' });
      }
      return listComparisonReferences(await resolveUserPublicId(request), ids, before);
    },
  );

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
