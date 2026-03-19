import type { FastifyInstance } from 'fastify';

import {
  findMockExerciseById,
  listMockExercises,
} from './mock-exercises.js';

export async function registerExerciseRoutes(app: FastifyInstance) {
  app.get('/exercises', async () => {
    return listMockExercises();
  });

  app.get<{ Params: { id: string } }>('/exercises/:id', async (request, reply) => {
    const exercise = findMockExerciseById(request.params.id);

    if (!exercise) {
      return reply.code(404).send({
        message: 'Exercise not found',
      });
    }

    return exercise;
  });
}

