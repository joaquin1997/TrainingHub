import type { FastifyInstance } from 'fastify';

import {
  createRoutine,
  deleteRoutine,
  findRoutineById,
  listRoutines,
  updateRoutine,
} from './repository.js';

type RoutineExerciseSetInput = {
  setNumber: number;
  minReps?: number;
  maxReps?: number;
  targetWeight?: number;
};

type RoutineExerciseInput = {
  exerciseName: string;
  orderIndex: number;
  sets: RoutineExerciseSetInput[];
};

type RoutineWriteInput = {
  name: string;
  description?: string;
  exercises: RoutineExerciseInput[];
};

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
): RoutineExerciseSetInput | null {
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
    typeof value.exerciseName !== 'string' ||
    !value.exerciseName.trim()
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
    .filter((set): set is RoutineExerciseSetInput => set !== null);

  if (sets.length !== setsInput.length) {
    return null;
  }

  return {
    exerciseName: value.exerciseName.trim(),
    orderIndex,
    sets,
  };
}

function parseRoutineWriteInput(body: unknown): RoutineWriteInput | null {
  if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim()) {
    return null;
  }

  const exercisesInput = Array.isArray(body.exercises) ? body.exercises : [];
  const exercises = exercisesInput
    .map((exercise, index) => parseRoutineExerciseInput(exercise, index + 1))
    .filter((exercise): exercise is RoutineExerciseInput => exercise !== null);

  if (exercises.length !== exercisesInput.length) {
    return null;
  }

  return {
    name: body.name.trim(),
    description: parseOptionalString(body.description),
    exercises,
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
    const input = parseRoutineWriteInput(request.body);

    if (!input) {
      return reply.code(400).send({
        message: 'Invalid routine payload',
      });
    }

    const routine = await createRoutine(input);

    return reply.code(201).send(routine);
  });

  app.put<{ Params: { id: string }; Body: unknown }>(
    '/routines/:id',
    async (request, reply) => {
      const input = parseRoutineWriteInput(request.body);

      if (!input) {
        return reply.code(400).send({
          message: 'Invalid routine payload',
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
