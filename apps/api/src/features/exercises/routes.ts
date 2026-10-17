import type { FastifyInstance } from 'fastify';

import {
  addFavoriteExercise,
  createExercise,
  findExerciseById,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listFavoriteExerciseIds,
  listMuscleGroups,
  removeFavoriteExercise,
} from './repository.js';
import { isExerciseTrackingType } from './trackingTypes.js';
import { resolveUserPublicId } from '../../infrastructure/userContext.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

function parseCreateExerciseInput(body: unknown) {
  if (
    !isRecord(body) ||
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    !isStringArray(body.primaryMuscleGroupIds) ||
    !isStringArray(body.secondaryMuscleGroupIds) ||
    (body.trackingType !== undefined && !isExerciseTrackingType(body.trackingType))
  ) {
    return null;
  }

  return {
    name: body.name.trim(),
    primaryMuscleGroupIds: body.primaryMuscleGroupIds.map((id) => id.trim()),
    secondaryMuscleGroupIds: body.secondaryMuscleGroupIds.map((id) => id.trim()),
    trackingType: body.trackingType,
  };
}

export async function registerExerciseRoutes(app: FastifyInstance) {
  app.get('/exercises', async () => {
    return listExercises();
  });

  app.get('/muscle-groups', async () => {
    return listMuscleGroups();
  });

  app.get('/exercises/favorites', async (request) => {
    return listFavoriteExerciseIds(await resolveUserPublicId(request));
  });

  app.put<{ Params: { id: string } }>(
    '/exercises/:id/favorite',
    async (request, reply) => {
      const ok = await addFavoriteExercise(
        await resolveUserPublicId(request),
        request.params.id,
      );

      if (!ok) {
        return reply.code(404).send({ message: 'Exercise not found' });
      }

      return reply.code(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/exercises/:id/favorite',
    async (request, reply) => {
      await removeFavoriteExercise(
        await resolveUserPublicId(request),
        request.params.id,
      );
      return reply.code(204).send();
    },
  );

  app.post<{ Body: unknown }>('/exercises', async (request, reply) => {
    const input = parseCreateExerciseInput(request.body);

    if (!input) {
      return reply.code(400).send({
        message: 'Invalid exercise payload',
      });
    }

    try {
      const exercise = await createExercise(
        await resolveUserPublicId(request),
        input,
      );

      return reply.code(201).send(exercise);
    } catch (error) {
      if (error instanceof InvalidMuscleGroupSelectionError) {
        return reply.code(400).send({
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/exercises/:id', async (request, reply) => {
    const exercise = await findExerciseById(request.params.id);

    if (!exercise) {
      return reply.code(404).send({
        message: 'Exercise not found',
      });
    }

    return exercise;
  });
}
