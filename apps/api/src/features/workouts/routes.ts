import type { FastifyInstance } from 'fastify';

import {
  addMockWorkoutSet,
  findMockWorkoutSessionById,
  finishMockWorkoutSession,
  listMockWorkoutSessions,
  startMockWorkoutSession,
} from './mock-workouts.js';

type StartWorkoutBody = {
  userId?: string;
  routineId?: string;
  notes?: string;
};

type AddWorkoutSetBody = {
  workoutExerciseId?: string;
  exerciseId?: string;
  routineExerciseId?: string;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  isWarmup?: boolean;
};

export async function registerWorkoutRoutes(app: FastifyInstance) {
  app.post<{ Body: StartWorkoutBody }>('/workouts/start', async (request, reply) => {
    const workoutSession = startMockWorkoutSession(request.body ?? {});

    return reply.code(201).send(workoutSession);
  });

  app.post<{ Params: { id: string }; Body: AddWorkoutSetBody }>(
    '/workouts/:id/sets',
    async (request, reply) => {
      const result = addMockWorkoutSet(request.params.id, request.body ?? {});

      if (!result) {
        return reply.code(404).send({
          message: 'Workout session not found',
        });
      }

      if ('error' in result) {
        return reply.code(400).send({
          message: result.error,
        });
      }

      return reply.code(201).send(result);
    },
  );

  app.post<{ Params: { id: string } }>('/workouts/:id/finish', async (request, reply) => {
    const workoutSession = finishMockWorkoutSession(request.params.id);

    if (!workoutSession) {
      return reply.code(404).send({
        message: 'Workout session not found',
      });
    }

    return workoutSession;
  });

  app.get('/workouts', async () => {
    return listMockWorkoutSessions();
  });

  app.get<{ Params: { id: string } }>('/workouts/:id', async (request, reply) => {
    const workoutSession = findMockWorkoutSessionById(request.params.id);

    if (!workoutSession) {
      return reply.code(404).send({
        message: 'Workout session not found',
      });
    }

    return workoutSession;
  });
}

