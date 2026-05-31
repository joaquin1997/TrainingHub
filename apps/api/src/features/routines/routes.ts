import type { FastifyInstance } from 'fastify';
import type {
  CreateRoutineInput,
  RoutineExerciseInput,
  RoutineSetInput,
} from '@workout/domain';

import { findExerciseById } from '../exercises/repository.js';
import {
  createRoutine,
  deleteRoutine,
  findRoutineById,
  listRoutines,
  updateRoutine,
  type RoutineWriteInput,
} from './repository.js';

function normalizeRoutineBody(body: unknown) {
  if (typeof body !== 'string') {
    return body;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseOptionalInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function parseRoutineExerciseSetInput(
  value: unknown,
  fallbackSetNumber: number,
): RoutineSetInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const setNumber =
    typeof value.setNumber === 'number' && Number.isInteger(value.setNumber)
      ? value.setNumber
      : fallbackSetNumber;

  return {
    setNumber,
    minReps: parseOptionalInteger(value.minReps),
    maxReps: parseOptionalInteger(value.maxReps),
    targetWeight: parseOptionalNumber(value.targetWeight),
  };
}

function parseRoutineExerciseInput(
  value: unknown,
  fallbackOrderIndex: number,
): RoutineExerciseInput | null {
  if (
    !isRecord(value) ||
    typeof value.exerciseId !== 'string' ||
    !value.exerciseId.trim()
  ) {
    return null;
  }

  const orderIndex =
    typeof value.orderIndex === 'number' && Number.isInteger(value.orderIndex)
      ? value.orderIndex
      : fallbackOrderIndex;

  const setsInput = Array.isArray(value.sets) ? value.sets : [];
  const sets = setsInput
    .map((set, index) => parseRoutineExerciseSetInput(set, index + 1))
    .filter((set): set is RoutineSetInput => set !== null);

  if (sets.length !== setsInput.length) {
    return null;
  }

  return {
    exerciseId: value.exerciseId.trim(),
    orderIndex,
    restSeconds: parseOptionalInteger(value.restSeconds),
    sets,
  };
}

function parseRoutineWriteInput(body: unknown): CreateRoutineInput | null {
  const normalizedBody = normalizeRoutineBody(body);

  if (
    !isRecord(normalizedBody) ||
    typeof normalizedBody.name !== 'string' ||
    !normalizedBody.name.trim()
  ) {
    return null;
  }

  const exercisesInput = Array.isArray(normalizedBody.exercises)
    ? normalizedBody.exercises
    : [];
  const exercises = exercisesInput
    .map((exercise, index) => parseRoutineExerciseInput(exercise, index + 1))
    .filter(
      (exercise): exercise is RoutineExerciseInput => exercise !== null,
    );

  if (exercises.length !== exercisesInput.length) {
    return null;
  }

  return {
    name: normalizedBody.name.trim(),
    description: parseOptionalString(normalizedBody.description),
    exercises,
  };
}

async function hydrateRoutineWriteInput(
  input: CreateRoutineInput,
): Promise<RoutineWriteInput | null> {
  const exercises = await Promise.all(
    input.exercises.map(
      async (
        exercise,
      ): Promise<RoutineWriteInput['exercises'][number] | null> => {
        const existingExercise = await findExerciseById(exercise.exerciseId);

        if (!existingExercise) {
          return null;
        }

        return {
          exerciseId: existingExercise.id,
          exerciseName: existingExercise.name,
          orderIndex: exercise.orderIndex,
          restSeconds: exercise.restSeconds,
          sets: exercise.sets,
        };
      },
    ),
  );

  if (exercises.some((exercise) => exercise === null)) {
    return null;
  }

  return {
    name: input.name,
    description: input.description,
    exercises: exercises.filter(
      (exercise): exercise is RoutineWriteInput['exercises'][number] =>
        exercise !== null,
    ),
  };
}

export async function registerRoutineRoutes(app: FastifyInstance) {
  app.get('/routines', async () => {
    return listRoutines();
  });

  app.get<{ Params: { id: string } }>('/routines/:id', async (request, reply) => {
    const routine = await findRoutineById(request.params.id);

    if (!routine) {
      return reply.code(404).send({
        message: 'Routine not found',
      });
    }

    return routine;
  });

  app.post<{ Body: unknown }>('/routines', async (request, reply) => {
    request.log.info(
      {
        bodyType: typeof request.body,
        body: request.body,
      },
      'Routine create request received',
    );

    const parsedInput = parseRoutineWriteInput(request.body);

    if (!parsedInput) {
      request.log.warn(
        {
          bodyType: typeof request.body,
          body: request.body,
        },
        'Routine create payload validation failed',
      );

      return reply.code(400).send({
        message: 'Invalid routine payload',
      });
    }

    const input = await hydrateRoutineWriteInput(parsedInput);

    if (!input) {
      return reply.code(400).send({
        message: 'Routine references unknown exercises',
      });
    }

    const routine = await createRoutine(input);

    return reply.code(201).send(routine);
  });

  app.put<{ Params: { id: string }; Body: unknown }>(
    '/routines/:id',
    async (request, reply) => {
      request.log.info(
        {
          routineId: request.params.id,
          bodyType: typeof request.body,
          body: request.body,
        },
        'Routine update request received',
      );

      const parsedInput = parseRoutineWriteInput(request.body);

      if (!parsedInput) {
        request.log.warn(
          {
            routineId: request.params.id,
            bodyType: typeof request.body,
            body: request.body,
          },
          'Routine update payload validation failed',
        );

        return reply.code(400).send({
          message: 'Invalid routine payload',
        });
      }

      const input = await hydrateRoutineWriteInput(parsedInput);

      if (!input) {
        return reply.code(400).send({
          message: 'Routine references unknown exercises',
        });
      }

      const routine = await updateRoutine(request.params.id, input);

      if (!routine) {
        return reply.code(404).send({
          message: 'Routine not found',
        });
      }

      return routine;
    },
  );

  app.delete<{ Params: { id: string } }>('/routines/:id', async (request, reply) => {
    const deleted = await deleteRoutine(request.params.id);

    if (!deleted) {
      return reply.code(404).send({
        message: 'Routine not found',
      });
    }

    return reply.code(204).send();
  });
}
