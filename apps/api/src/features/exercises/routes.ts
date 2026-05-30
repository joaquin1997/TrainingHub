import type { FastifyInstance } from 'fastify';

import {
  createExercise,
  findExerciseById,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listMuscleGroups,
} from './repository.js';

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
    !isStringArray(body.secondaryMuscleGroupIds)
  ) {
    return null;
  }

  return {
    name: body.name.trim(),
    primaryMuscleGroupIds: body.primaryMuscleGroupIds.map((id) => id.trim()),
    secondaryMuscleGroupIds: body.secondaryMuscleGroupIds.map((id) => id.trim()),
  };
}

export async function registerExerciseRoutes(app: FastifyInstance) {
  app.get('/exercises', async () => {
    return listExercises();
  });

  app.get('/muscle-groups', async () => {
    return listMuscleGroups();
  });

  app.post<{ Body: unknown }>('/exercises', async (request, reply) => {
    const input = parseCreateExerciseInput(request.body);

    if (!input) {
      return reply.code(400).send({
        message: 'Invalid exercise payload',
      });
    }

    try {
      const exercise = await createExercise(input);

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
